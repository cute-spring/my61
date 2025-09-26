import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';
import { ProcessedContent, ContentSection } from './types';

export class ConfluenceContentProcessor {
    private turndownService: TurndownService;

    constructor() {
        this.turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            bulletListMarker: '-',
            emDelimiter: '*'
        });

        this.setupCustomRules();
    }

    /**
     * Setup custom Turndown rules for Confluence-specific elements
     */
    private setupCustomRules(): void {
        // Handle Confluence info panels
        this.turndownService.addRule('confluenceInfoPanel', {
            filter: (node: any) => {
                return node.nodeName === 'DIV' && 
                       (node.classList?.contains('confluence-information-macro') ||
                        node.classList?.contains('aui-message'));
            },
            replacement: (content: string, node: any) => {
                const element = node as Element;
                const type = this.getInfoPanelType(element);
                return `\n> [${type.toUpperCase()}] ${content.trim()}\n\n`;
            }
        });

        // Handle Confluence code blocks
        this.turndownService.addRule('confluenceCodeBlock', {
            filter: (node: any) => {
                return node.nodeName === 'DIV' && 
                       node.classList?.contains('code');
            },
            replacement: (content: string) => {
                return `\n\`\`\`\n${content.trim()}\n\`\`\`\n\n`;
            }
        });

        // Handle Confluence tables with better formatting
        this.turndownService.addRule('confluenceTable', {
            filter: 'table',
            replacement: (content: string) => {
                return `\n${content}\n`;
            }
        });

        // Handle Confluence expand macros
        this.turndownService.addRule('confluenceExpand', {
            filter: (node: any) => {
                return node.nodeName === 'DIV' && 
                       node.classList?.contains('expand-container');
            },
            replacement: (content: string, node: any) => {
                const element = node as Element;
                const title = element.querySelector('.expand-control')?.textContent || 'Details';
                return `\n<details>\n<summary>${title}</summary>\n\n${content.trim()}\n\n</details>\n\n`;
            }
        });

        // Handle Confluence status macros
        this.turndownService.addRule('confluenceStatus', {
            filter: (node: any) => {
                return node.nodeName === 'SPAN' && 
                       node.classList?.contains('status-macro');
            },
            replacement: (content: string, node: any) => {
                const element = node as Element;
                const color = element.getAttribute('data-colour') || 'neutral';
                return `**[${content.trim().toUpperCase()}]**`;
            }
        });

        // Handle Confluence mentions
        this.turndownService.addRule('confluenceMention', {
            filter: (node: any) => {
                return node.nodeName === 'A' && 
                       node.classList?.contains('confluence-userlink');
            },
            replacement: (content: string) => {
                return `@${content.trim()}`;
            }
        });
    }

    /**
     * Determine the type of info panel from CSS classes
     */
    private getInfoPanelType(element: Element): string {
        const classList = Array.from(element.classList || []);
        
        if (classList.some(cls => cls.includes('info'))) return 'info';
        if (classList.some(cls => cls.includes('warning'))) return 'warning';
        if (classList.some(cls => cls.includes('error'))) return 'error';
        if (classList.some(cls => cls.includes('success'))) return 'success';
        if (classList.some(cls => cls.includes('note'))) return 'note';
        
        return 'info';
    }

    /**
     * Pre-process HTML to clean up Confluence-specific artifacts
     */
    private preprocessHtml(html: string): string {
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Remove Confluence-specific navigation and UI elements
        const elementsToRemove = [
            '.confluence-metadata-container',
            '.page-metadata',
            '.confluence-breadcrumbs',
            '.aui-navgroup',
            '.confluence-comments',
            '.likes-and-labels-container',
            '.page-restrictions-indicator'
        ];

        elementsToRemove.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((el: Element) => el.remove());
        });

        // Clean up empty paragraphs and divs
        const emptyElements = document.querySelectorAll('p:empty, div:empty');
        emptyElements.forEach((el: Element) => el.remove());

        // Convert Confluence-specific links to absolute URLs
        const links = document.querySelectorAll('a[href^="/"]');
        links.forEach((link: Element) => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('/')) {
                // Note: baseUrl would need to be passed in for this to work properly
                // For now, we'll leave relative links as-is
            }
        });

        return document.body.innerHTML;
    }

    /**
     * Extract content sections based on headings for source attribution
     */
    private extractSections(markdown: string): ContentSection[] {
        const sections: ContentSection[] = [];
        const lines = markdown.split('\n');
        let currentSection: ContentSection | null = null;
        let currentContent: string[] = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

            if (headingMatch) {
                // Save previous section if exists
                if (currentSection) {
                    currentSection.content = currentContent.join('\n').trim();
                    currentSection.endIndex = i - 1;
                    sections.push(currentSection);
                }

                // Start new section
                currentSection = {
                    heading: headingMatch[2],
                    content: '',
                    level: headingMatch[1].length,
                    startIndex: i,
                    endIndex: i
                };
                currentContent = [];
            } else if (currentSection) {
                currentContent.push(line);
            } else {
                // Content before first heading - create a default section
                if (sections.length === 0) {
                    currentSection = {
                        heading: 'Introduction',
                        content: '',
                        level: 1,
                        startIndex: 0,
                        endIndex: 0
                    };
                    currentContent = [line];
                } else {
                    currentContent.push(line);
                }
            }
        }

        // Save the last section
        if (currentSection) {
            currentSection.content = currentContent.join('\n').trim();
            currentSection.endIndex = lines.length - 1;
            sections.push(currentSection);
        }

        return sections.filter(section => section.content.trim().length > 0);
    }

    /**
     * Calculate word count from markdown content
     */
    private calculateWordCount(markdown: string): number {
        // Remove markdown syntax and count words
        const plainText = markdown
            .replace(/#{1,6}\s+/g, '') // Remove heading markers
            .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers
            .replace(/\*([^*]+)\*/g, '$1') // Remove italic markers
            .replace(/`([^`]+)`/g, '$1') // Remove inline code markers
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove link syntax, keep text
            .replace(/>\s*\[[\w\s]+\]/g, '') // Remove info panel markers
            .replace(/\n+/g, ' ') // Replace newlines with spaces
            .trim();

        return plainText.split(/\s+/).filter(word => word.length > 0).length;
    }

    /**
     * Process Confluence HTML content into structured markdown
     */
    public processContent(html: string, title: string, url: string, lastModified: string): ProcessedContent {
        // Pre-process HTML to clean up Confluence artifacts
        const cleanedHtml = this.preprocessHtml(html);

        // Convert to markdown
        const markdown = this.turndownService.turndown(cleanedHtml);

        // Extract sections for source attribution
        const sections = this.extractSections(markdown);

        // Calculate metadata
        const wordCount = this.calculateWordCount(markdown);

        return {
            markdown,
            sections,
            metadata: {
                title,
                url,
                lastModified,
                wordCount
            }
        };
    }

    /**
     * Find the most relevant section for a given query or content
     */
    public findRelevantSection(sections: ContentSection[], query: string): ContentSection | null {
        if (sections.length === 0) return null;

        // Simple relevance scoring based on keyword matching
        const queryWords = query.toLowerCase().split(/\s+/);
        let bestSection: ContentSection | null = null;
        let bestScore = 0;

        for (const section of sections) {
            const sectionText = (section.heading + ' ' + section.content).toLowerCase();
            let score = 0;

            for (const word of queryWords) {
                const occurrences = (sectionText.match(new RegExp(word, 'g')) || []).length;
                score += occurrences;
            }

            if (score > bestScore) {
                bestScore = score;
                bestSection = section;
            }
        }

        return bestSection;
    }

    /**
     * Generate a citation for a content section
     */
    public generateCitation(section: ContentSection, pageTitle: string): string {
        return `Source: "${section.heading}" section from "${pageTitle}"`;
    }

    /**
     * Truncate content if it exceeds the specified limit
     */
    public truncateContent(markdown: string, maxLength: number = 50000): { content: string; wasTruncated: boolean } {
        if (markdown.length <= maxLength) {
            return { content: markdown, wasTruncated: false };
        }

        // Try to truncate at a natural break point (paragraph or section)
        const truncated = markdown.substring(0, maxLength);
        const lastParagraphBreak = truncated.lastIndexOf('\n\n');
        const lastSectionBreak = truncated.lastIndexOf('\n#');

        const breakPoint = Math.max(lastParagraphBreak, lastSectionBreak);
        const finalContent = breakPoint > maxLength * 0.8 ? 
            truncated.substring(0, breakPoint) : 
            truncated;

        return {
            content: finalContent + '\n\n[Content truncated due to length...]',
            wasTruncated: true
        };
    }
}