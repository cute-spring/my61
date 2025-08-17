#!/bin/bash

set -euo pipefail

# Cleanup function for temporary files and sensitive data
cleanup() {
    local exit_code=$?
    # Clean up any temporary files
    rm -f /tmp/claude_test_$$ /tmp/claude_test_$$.exit 2>/dev/null || true
    # Clear sensitive variables
    unset api_key confirm_key effective_api_key 2>/dev/null || true
    exit $exit_code
}

# Set up signal handlers for cleanup
trap cleanup EXIT INT TERM

# ========================
#       常量定义
# ========================
SCRIPT_NAME=$(basename "$0")
SCRIPT_VERSION="1.0.0"
NODE_MIN_VERSION=18
NODE_INSTALL_VERSION=22
NVM_VERSION="v0.40.3"
CLAUDE_PACKAGE="@anthropic-ai/claude-code"
CONFIG_DIR="$HOME/.claude"
CONFIG_FILE="$CONFIG_DIR/settings.json"
MODELS_CONFIG_FILE="$CONFIG_DIR/models.json"

# 默认模型配置
zhipu_base_url="https://open.bigmodel.cn/api/anthropic"
zhipu_api_url="https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys"
zhipu_name="ZHIPU (智谱AI)"
anthropic_base_url="https://api.anthropic.com"
anthropic_api_url="https://console.anthropic.com/"
anthropic_name="Anthropic (Official)"
k2_base_url="https://api.moonshot.cn/anthropic/"
k2_api_url="https://platform.moonshot.cn/console/api-keys"
k2_name="Kimi K2"

# 当前使用的模型设置（可通过参数或配置文件覆盖）
CURRENT_MODEL="zhipu"
API_BASE_URL="$zhipu_base_url"
API_KEY_URL="$zhipu_api_url"
API_TIMEOUT_MS=3000000

# ========================
#       工具函数
# ========================

log_info() {
    echo "🔹 $*" >&2
}

log_success() {
    echo "✅ $*" >&2
}

log_error() {
    echo "❌ $*" >&2
}

log_warning() {
    echo "⚠️  $*" >&2
}

log_debug() {
    if [[ "${DEBUG:-}" == "1" ]]; then
        echo "🐛 DEBUG: $*" >&2
    fi
}

ensure_dir_exists() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        log_debug "Creating directory: $dir"
        mkdir -p "$dir" || {
            log_error "Failed to create directory: $dir"
            return 1
        }
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Validate URL format
validate_url() {
    local url="$1"
    if [[ "$url" =~ ^https?:// ]]; then
        return 0
    else
        return 1
    fi
}

# ========================
#     Node.js 安装函数
# ========================

install_nodejs() {
    local platform=$(uname -s)

    case "$platform" in
        Linux|Darwin)
            log_info "Installing Node.js on $platform..."

            # 检查并安装 nvm (如果需要)
            if ! check_nvm; then
                log_info "Installing nvm ($NVM_VERSION)..."
                curl -s https://raw.githubusercontent.com/nvm-sh/nvm/"$NVM_VERSION"/install.sh | bash
                
                # 加载 nvm
                log_info "Loading nvm environment..."
                \. "$HOME/.nvm/nvm.sh"
            fi

            # 安装 Node.js
            log_info "Installing Node.js $NODE_INSTALL_VERSION..."
            nvm install "$NODE_INSTALL_VERSION"
            nvm use "$NODE_INSTALL_VERSION"

            # 验证安装
            node -v &>/dev/null || {
                log_error "Node.js installation failed"
                exit 1
            }
            log_success "Node.js installed: $(node -v)"
            log_success "npm version: $(npm -v)"
            ;;
        *)
            log_error "Unsupported platform: $platform"
            exit 1
            ;;
    esac
}

# ========================
#     Node.js 检查函数
# ========================

check_nodejs() {
    log_info "Checking Node.js installation..."
    
    if command_exists node; then
        local current_version
        current_version=$(node -v | sed 's/v//')
        local major_version
        major_version=$(echo "$current_version" | cut -d. -f1)

        if [ "$major_version" -ge "$NODE_MIN_VERSION" ]; then
            log_success "Node.js is already installed: v$current_version (✓)"
            return 0
        else
            log_info "Node.js v$current_version is installed but version < $NODE_MIN_VERSION. Upgrading..."
            install_nodejs
        fi
    else
        log_info "Node.js not found. Installing..."
        install_nodejs
    fi
}

# ========================
#     NVM 检查函数
# ========================

check_nvm() {
    log_info "Checking NVM installation..."
    
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        \. "$HOME/.nvm/nvm.sh"
        if command -v nvm &>/dev/null; then
            nvm_version=$(nvm --version 2>/dev/null || echo "unknown")
            log_success "NVM is already installed: v$nvm_version (✓)"
            return 0
        fi
    fi
    
    log_info "NVM not found or not properly configured"
    return 1
}

# ========================
#   系统依赖检查函数
# ========================

check_system_dependencies() {
    log_info "Checking system dependencies..."
    
    local missing_deps=()
    
    # 检查 curl
    if ! command -v curl &>/dev/null; then
        missing_deps+=("curl")
    else
        log_success "curl is installed (✓)"
    fi
    
    # 检查 git (可选但推荐)
    if ! command -v git &>/dev/null; then
        log_info "git not found (optional but recommended)"
    else
        log_success "git is installed (✓)"
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_error "Please install them first and run the script again"
        exit 1
    fi
}

# ========================
#   Claude Code 检查函数
# ========================

check_claude_installation() {
    log_info "Checking Claude Code installation..."
    
    if command_exists claude; then
        local claude_version
        claude_version=$(claude --version 2>/dev/null || echo "unknown")
        log_success "Claude Code is already installed: $claude_version (✓)"
        return 0
    else
        log_info "Claude Code not found"
        return 1
    fi
}

# ========================
#   配置文件检查函数
# ========================

check_claude_config() {
    log_info "Checking Claude Code configuration..."
    
    if [ -f "$CONFIG_FILE" ]; then
        # 检查配置文件是否包含必要的配置
        if grep -q "ANTHROPIC_AUTH_TOKEN" "$CONFIG_FILE" 2>/dev/null && \
           grep -q "ANTHROPIC_BASE_URL" "$CONFIG_FILE" 2>/dev/null; then
            log_success "Claude Code configuration exists (✓)"
            return 0
        else
            log_info "Claude Code configuration incomplete"
            return 1
        fi
    else
        log_info "Claude Code configuration not found"
        return 1
    fi
}

# ========================
#     Claude Code 安装
# ========================

install_claude_code() {
    if check_claude_installation; then
        return 0
    fi
    
    log_info "Installing Claude Code..."
    npm install -g "$CLAUDE_PACKAGE" || {
        log_error "Failed to install claude-code"
        log_error "Try running: npm cache clean --force && npm install -g $CLAUDE_PACKAGE"
        exit 1
    }
    log_success "Claude Code installed successfully"
    
    # 检查并配置 PATH
    configure_npm_path
    
    # 验证安装
    if ! check_claude_installation; then
        log_error "Claude Code installation verification failed"
        exit 1
    fi
}

# ========================
#     PATH 配置函数
# ========================

configure_npm_path() {
    local npm_prefix=$(npm config get prefix)
    local npm_bin_dir="$npm_prefix/bin"
    
    # 检查 PATH 中是否已包含 npm bin 目录
    if [[ ":$PATH:" != *":$npm_bin_dir:"* ]]; then
        log_info "Adding npm global bin directory to PATH..."
        
        # 根据 shell 类型选择配置文件
        local shell_config=""
        case "$SHELL" in
            */bash)
                shell_config="$HOME/.bash_profile"
                [ ! -f "$shell_config" ] && shell_config="$HOME/.bashrc"
                ;;
            */zsh)
                shell_config="$HOME/.zshrc"
                ;;
            *)
                shell_config="$HOME/.profile"
                ;;
        esac
        
        # 添加 PATH 配置
        echo "export PATH=\"$npm_bin_dir:\$PATH\"" >> "$shell_config"
        
        # 更新当前会话的 PATH
        export PATH="$npm_bin_dir:$PATH"
        
        log_success "PATH configured. You may need to restart your terminal or run 'source $shell_config'"
    else
        log_success "npm global bin directory is already in PATH"
    fi
}

# ========================
#   环境变量配置函数
# ========================

configure_environment_variables() {
    local api_key="$1"
    
    # 根据 shell 类型选择配置文件
    local shell_config=""
    case "$SHELL" in
        */bash)
            shell_config="$HOME/.bash_profile"
            [ ! -f "$shell_config" ] && shell_config="$HOME/.bashrc"
            ;;
        */zsh)
            shell_config="$HOME/.zshrc"
            ;;
        *)
            shell_config="$HOME/.profile"
            ;;
    esac
    
    # 检查是否已经配置了环境变量
    if ! grep -q "ANTHROPIC_BASE_URL" "$shell_config" 2>/dev/null; then
        echo ""
        read -p "🤔 Do you want to add environment variables as fallback? (recommended for compatibility) (Y/n): " add_env_vars
        
        if [[ ! "$add_env_vars" =~ ^[Nn]$ ]]; then
            log_info "Configuring environment variables as fallback..."
            
            cat >> "$shell_config" << EOF

# ═══════════════════════════════════════════════════════════════════
# Claude Code Environment Variables (Fallback Configuration)
# ═══════════════════════════════════════════════════════════════════
# Note: Primary configuration is in ~/.claude/settings.json
# These environment variables serve as fallback if needed
# For better security, consider using external secret management

export ANTHROPIC_BASE_URL="$API_BASE_URL"

# Uncomment the following line ONLY if Claude doesn't read from config file:
# export ANTHROPIC_AUTH_TOKEN="your_api_key_here"

# ═══════════════════════════════════════════════════════════════════
EOF
            
            log_success "Environment variables configured in $shell_config"
            log_info "Primary API key storage: ~/.claude/settings.json (secure)"
            log_info "Fallback setup: Environment variable template added (secure)"
        else
            log_info "Skipping environment variable configuration"
        fi
    else
        log_success "Environment variables already configured in $shell_config"
    fi
}

# Simple list function for command line usage
list_models_simple() {
    init_models_config
    local current_model=$(get_current_model)
    
    echo "🤖 Available Models"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -f "$MODELS_CONFIG_FILE" ]; then
        local models
        models=$(node -e "
const fs = require('fs');
try {
    const data = JSON.parse(fs.readFileSync('$MODELS_CONFIG_FILE', 'utf-8'));
    Object.entries(data.models || {}).forEach(([modelId, model]) => {
        const status = modelId === '$current_model' ? ' (current)' : '';
        console.log(\`   \${modelId.padEnd(12)} - \${model.name || 'Unknown'}\${status}\`);
    });
} catch (e) {
    process.exit(1);
}
" 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$models" ]; then
            echo "$models"
        else
            log_error "Failed to read models configuration"
            echo "   Available: zhipu, anthropic, k2"
        fi
    else
        echo "   zhipu        - ZHIPU AI (default)"
        echo "   anthropic    - Anthropic Claude"
        echo "   k2           - Kimi K2"
    fi
    
    echo ""
    echo "💡 Usage:"
    echo "   $0 --switch MODEL         # Switch to a model"
    echo "   $0 --configure MODEL      # Configure model API key"
    echo "   $0 --models               # List models (this command)"
}

configure_claude_json(){
  node --eval '
      const os = require("os");
      const fs = require("fs");
      const path = require("path");

      const homeDir = os.homedir();
      const filePath = path.join(homeDir, ".claude.json");
      if (fs.existsSync(filePath)) {
          const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
          fs.writeFileSync(filePath, JSON.stringify({ ...content, hasCompletedOnboarding: true }, null, 2), "utf-8");
      } else {
          fs.writeFileSync(filePath, JSON.stringify({ hasCompletedOnboarding: true }, null, 2), "utf-8");
      }'
}

# ========================
#   多模型管理函数
# ========================

init_models_config() {
    if [ ! -f "$MODELS_CONFIG_FILE" ]; then
        log_info "Creating models configuration file..."
        cat > "$MODELS_CONFIG_FILE" << 'EOF'
{
  "models": {
    "zhipu": {
      "name": "ZHIPU (智谱AI)",
      "base_url": "https://open.bigmodel.cn/api/anthropic",
      "api_key_url": "https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys",
      "api_key": "",
      "active": true
    },
    "anthropic": {
      "name": "Anthropic (Official)",
      "base_url": "https://api.anthropic.com",
      "api_key_url": "https://console.anthropic.com/",
      "api_key": "",
      "active": false
    },
    "k2": {
      "name": "Kimi K2",
      "base_url": "https://api.moonshot.cn/anthropic/",
      "api_key_url": "https://platform.moonshot.cn/console/api-keys",
      "api_key": "",
      "active": false
    }
  },
  "current_model": "zhipu"
}
EOF
        chmod 600 "$MODELS_CONFIG_FILE"
        log_success "Models configuration initialized"
    fi
}

get_current_model() {
    if [ -f "$MODELS_CONFIG_FILE" ]; then
        node -e "
            const fs = require('fs');
            const config = JSON.parse(fs.readFileSync('$MODELS_CONFIG_FILE', 'utf-8'));
            console.log(config.current_model || 'zhipu');
        " 2>/dev/null || echo "zhipu"
    else
        echo "zhipu"
    fi
}

get_model_info() {
    local model_key="$1"
    local info_key="$2"
    
    if [ -f "$MODELS_CONFIG_FILE" ]; then
        node -e "
            const fs = require('fs');
            const config = JSON.parse(fs.readFileSync('$MODELS_CONFIG_FILE', 'utf-8'));
            const model = config.models['$model_key'];
            if (model && model['$info_key']) {
                console.log(model['$info_key']);
            }
        " 2>/dev/null
    fi
}

list_models() {
    echo ""
    echo "🤖 Available LLM Models"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ -f "$MODELS_CONFIG_FILE" ]; then
        local current_model
        current_model=$(get_current_model)
        
        node -e "
            const fs = require('fs');
            const config = JSON.parse(fs.readFileSync('$MODELS_CONFIG_FILE', 'utf-8'));
            Object.entries(config.models).forEach(([key, model]) => {
                const status = key === '$current_model' ? '✅ ACTIVE' : '⚪ Available';
                const apiKey = model.api_key ? (model.api_key.substring(0, 8) + '...') : 'Not configured';
                console.log(\`   \${status} \${key}: \${model.name}\`);
                console.log(\`      API Key: \${apiKey}\`);
                console.log(\`      Base URL: \${model.base_url}\`);
                console.log('');
            });
        " 2>/dev/null
    else
        echo "   No models configuration found. Run --config to set up."
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

switch_model() {
    local target_model="${1:-}"
    
    if [ -z "$target_model" ]; then
        echo ""
        echo "🔄 Switch LLM Model"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        list_models
        read -p "🔧 Enter model key to switch to (zhipu/anthropic/custom): " target_model
    fi
    
    if [ -f "$MODELS_CONFIG_FILE" ]; then
        # Check if model exists
        local model_exists
        model_exists=$(node -e "
            const fs = require('fs');
            const config = JSON.parse(fs.readFileSync('$MODELS_CONFIG_FILE', 'utf-8'));
            console.log(config.models['$target_model'] ? 'true' : 'false');
        " 2>/dev/null)
        
        if [ "$model_exists" = "true" ]; then
            # Update current model
            node -e "
                const fs = require('fs');
                const config = JSON.parse(fs.readFileSync('$MODELS_CONFIG_FILE', 'utf-8'));
                config.current_model = '$target_model';
                fs.writeFileSync('$MODELS_CONFIG_FILE', JSON.stringify(config, null, 2));
            " 2>/dev/null
            
            # Update Claude settings
            update_claude_settings_from_model "$target_model"
            
            log_success "Switched to model: $target_model"
            
            # Update script variables
            CURRENT_MODEL="$target_model"
            API_BASE_URL=$(get_model_info "$target_model" "base_url")
            API_KEY_URL=$(get_model_info "$target_model" "api_key_url")
            
        else
            log_error "Model '$target_model' not found"
            return 1
        fi
    else
        log_error "Models configuration not found. Run --config to set up."
        return 1
    fi
}

update_claude_settings_from_model() {
    local model_key="$1"
    local api_key
    local base_url
    
    api_key=$(get_model_info "$model_key" "api_key")
    base_url=$(get_model_info "$model_key" "base_url")
    
    # Always update the settings file with at least the base URL
    ensure_dir_exists "$CONFIG_DIR"
    
    # Use placeholder for API key if not configured
    local effective_api_key="${api_key:-your-api-key-here}"
    
    node --eval '
        const os = require("os");
        const fs = require("fs");
        const path = require("path");

        const homeDir = os.homedir();
        const filePath = path.join(homeDir, ".claude", "settings.json");
        const apiKey = "'"$effective_api_key"'";
        const baseUrl = "'"$base_url"'";

        const content = fs.existsSync(filePath)
            ? JSON.parse(fs.readFileSync(filePath, "utf-8"))
            : {};

        fs.writeFileSync(filePath, JSON.stringify({
            ...content,
            env: {
                ANTHROPIC_AUTH_TOKEN: apiKey,
                ANTHROPIC_BASE_URL: baseUrl,
                API_TIMEOUT_MS: "'"$API_TIMEOUT_MS"'",
            }
        }, null, 2), "utf-8");
    ' 2>/dev/null
    
    chmod 600 "$CONFIG_FILE" 2>/dev/null
    
    if [ -n "$api_key" ] && [ "$api_key" != "your-api-key-here" ]; then
        log_success "Claude settings updated for model: $model_key"
    else
        log_info "Model switched to: $model_key (API key not configured yet)"
        log_info "Run: $0 --configure $model_key to set up API key"
    fi
}

configure_model() {
    local model_key="${1:-}"
    
    if [ -z "$model_key" ]; then
        echo ""
        echo "🔧 Configure Model"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        list_models
        read -p "🔧 Enter model key to configure (zhipu/anthropic): " model_key
    fi
    
    init_models_config
    
    # Get model info
    local model_name
    local model_api_url
    model_name=$(get_model_info "$model_key" "name")
    model_api_url=$(get_model_info "$model_key" "api_key_url")
    
    if [ -z "$model_name" ]; then
        log_error "Model '$model_key' not found"
        return 1
    fi
    
    echo ""
    echo "🔐 Configure $model_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   Get your API key from: $model_api_url"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Secure API key input
    local api_key=""
    local confirm_key=""
    
    while true; do
        read -s -p "🔑 Please enter your API key for $model_name: " api_key
        echo ""
        
        if [ -z "$api_key" ]; then
            log_error "API key cannot be empty. Please try again."
            continue
        fi
        
        if [[ ${#api_key} -lt 10 ]]; then
            log_error "API key seems too short. Please check and try again."
            continue
        fi
        
        read -s -p "🔑 Please confirm your API key: " confirm_key
        echo ""
        
        if [ "$api_key" = "$confirm_key" ]; then
            log_success "API key confirmed"
            break
        else
            log_error "API keys don't match. Please try again."
            api_key=""
            confirm_key=""
        fi
    done
    
    # Update models configuration
    node -e "
        const fs = require('fs');
        const config = JSON.parse(fs.readFileSync('$MODELS_CONFIG_FILE', 'utf-8'));
        config.models['$model_key'].api_key = '$api_key';
        fs.writeFileSync('$MODELS_CONFIG_FILE', JSON.stringify(config, null, 2));
    " 2>/dev/null
    
    chmod 600 "$MODELS_CONFIG_FILE"
    log_success "API key configured for $model_name"
    
    # Ask if user wants to switch to this model
    read -p "🔄 Do you want to switch to $model_name now? (Y/n): " switch_now
    if [[ ! "$switch_now" =~ ^[Nn]$ ]]; then
        switch_model "$model_key"
    fi
}

# ========================
#   API Key 信息和管理函数
# ========================

show_api_key_info() {
    echo ""
    echo "🔑 API Key Information & Management"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check if config file exists
    if [ -f "$CONFIG_FILE" ]; then
        echo "📍 API Key Location:"
        echo "   Primary: $CONFIG_FILE"
        echo "   Permissions: $(ls -la "$CONFIG_FILE" | awk '{print $1, $3, $4}')"
        
        # Show masked API key
        if grep -q "ANTHROPIC_AUTH_TOKEN" "$CONFIG_FILE" 2>/dev/null; then
            local masked_key
            masked_key=$(grep "ANTHROPIC_AUTH_TOKEN" "$CONFIG_FILE" | sed 's/.*: *"\([^"]*\)".*/\1/' | sed 's/\(.\{8\}\).*/\1.../')
            echo "   Current Key: ${masked_key} (masked for security)"
        else
            echo "   Current Key: Not found in config file"
        fi
        
        echo ""
        echo "🔄 How to Update Your API Key:"
        echo "   Method 1 (Recommended): Run this script again"
        echo "     bash $0"
        echo ""
        echo "   Method 2: Edit config file directly"
        echo "     nano $CONFIG_FILE"
        echo "     # Update the ANTHROPIC_AUTH_TOKEN value"
        echo ""
        echo "   Method 3: Use Claude's built-in config command"
        echo "     claude config set ANTHROPIC_AUTH_TOKEN your_new_key_here"
        echo ""
        
    else
        echo "❌ No configuration file found at: $CONFIG_FILE"
        echo ""
        echo "🔧 To set up your API key:"
        echo "   Run this script: bash $0"
        echo ""
    fi
    
    # Check environment variables
    local shell_config=""
    case "$SHELL" in
        */bash)
            shell_config="$HOME/.bash_profile"
            [ ! -f "$shell_config" ] && shell_config="$HOME/.bashrc"
            ;;
        */zsh)
            shell_config="$HOME/.zshrc"
            ;;
        *)
            shell_config="$HOME/.profile"
            ;;
    esac
    
    if [ -f "$shell_config" ] && grep -q "ANTHROPIC_AUTH_TOKEN" "$shell_config" 2>/dev/null; then
        echo "⚠️  Environment Variable Fallback:"
        echo "   Found in: $shell_config"
        echo "   Note: Environment variables are less secure than config files"
        echo ""
    fi
    
    echo "🔗 Get New API Key:"
    echo "   Website: $API_KEY_URL"
    echo ""
    echo "🧪 Test API Key:"
    echo "   claude -p \"test\""
    echo ""
    echo "❓ Troubleshooting:"
    echo "   • If expired: Get new key from website above"
    echo "   • If invalid: Check for typos in the key"
    echo "   • If network issues: Check internet connection"
    echo "   • If permission denied: Check file permissions (should be 600)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ========================
#   Claude 配置管理函数
# ========================

manage_claude_config() {
    echo ""
    echo "🛠️  Claude Configuration Management"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   1) Show API key information"
    echo "   2) Update current model API key"
    echo "   3) Test current configuration"
    echo "   4) List all models"
    echo "   5) Switch model"
    echo "   6) Configure model"
    echo "   7) Add custom model"
    echo "   8) Edit existing model"
    echo "   9) Reset configuration"
    echo "   10) Back to main menu"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    read -p "🔧 Choose an option (1-10): " choice
    
    case $choice in
        1)
            show_api_key_info
            read -p "Press Enter to continue..."
            ;;
        2)
            echo ""
            local current_model
            current_model=$(get_current_model)
            log_info "Updating API key for current model: $current_model"
            configure_model "$current_model"
            ;;
        3)
            echo ""
            test_claude_config
            read -p "Press Enter to continue..."
            ;;
        4)
            list_models
            read -p "Press Enter to continue..."
            ;;
        5)
            echo ""
            switch_model
            read -p "Press Enter to continue..."
            ;;
        6)
            echo ""
            configure_model
            read -p "Press Enter to continue..."
            ;;
        7)
            echo ""
            add_custom_model
            read -p "Press Enter to continue..."
            ;;
        8)
            echo ""
            edit_model
            read -p "Press Enter to continue..."
            ;;
        9)
            echo ""
            read -p "⚠️  Are you sure you want to reset ALL configuration? (y/N): " confirm
            if [[ "$confirm" =~ ^[Yy]$ ]]; then
                rm -f "$CONFIG_FILE"
                rm -f "$HOME/.claude.json"
                rm -f "$MODELS_CONFIG_FILE"
                log_success "All configuration reset successfully"
                log_info "Run the script again to reconfigure"
            else
                log_info "Reset cancelled"
            fi
            read -p "Press Enter to continue..."
            ;;
        10)
            return 0
            ;;
        *)
            log_error "Invalid option. Please choose 1-10."
            read -p "Press Enter to continue..."
            manage_claude_config
            ;;
    esac
}

edit_model() {
    echo ""
    echo "📝 Edit Existing Model"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    init_models_config
    list_models
    
    read -p "🔧 Enter model key to edit: " model_key
    if [ -z "$model_key" ]; then
        log_error "Model key cannot be empty"
        return 1
    fi
    
    # Check if model exists
    local model_exists
    model_exists=$(node -e "
        const fs = require('fs');
        const config = JSON.parse(fs.readFileSync('$MODELS_CONFIG_FILE', 'utf-8'));
        console.log(config.models['$model_key'] ? 'true' : 'false');
    " 2>/dev/null)
    
    if [ "$model_exists" != "true" ]; then
        log_error "Model '$model_key' not found"
        return 1
    fi
    
    # Get current model info
    local current_name current_base_url current_api_key_url
    current_name=$(get_model_info "$model_key" "name")
    current_base_url=$(get_model_info "$model_key" "base_url")
    current_api_key_url=$(get_model_info "$model_key" "api_key_url")
    
    echo ""
    echo "📋 Current Configuration for '$model_key':"
    echo "   Name: $current_name"
    echo "   Base URL: $current_base_url"
    echo "   API Key URL: $current_api_key_url"
    echo ""
    
    echo "🔧 What would you like to edit?"
    echo "   1) Model name"
    echo "   2) Base URL"
    echo "   3) API Key URL"
    echo "   4) All fields"
    echo "   5) Cancel"
    
    read -p "Choose option (1-5): " edit_choice
    
    case $edit_choice in
        1)
            read -p "📝 Enter new model name (current: $current_name): " new_name
            if [ -n "$new_name" ]; then
                node -e "
                    const fs = require('fs');
                    const config = JSON.parse(fs.readFileSync('$MODELS_CONFIG_FILE', 'utf-8'));
                    config.models['$model_key'].name = '$new_name';
                    fs.writeFileSync('$MODELS_CONFIG_FILE', JSON.stringify(config, null, 2));
                " 2>/dev/null
                log_success "Model name updated to: $new_name"
            fi
            ;;
        2)
            read -p "🔗 Enter new base URL (current: $current_base_url): " new_base_url
            if [ -n "$new_base_url" ]; then
                node -e "
                    const fs = require('fs');
                    const config = JSON.parse(fs.readFileSync('$MODELS_CONFIG_FILE', 'utf-8'));
                    config.models['$model_key'].base_url = '$new_base_url';
                    fs.writeFileSync('$MODELS_CONFIG_FILE', JSON.stringify(config, null, 2));
                " 2>/dev/null
                log_success "Base URL updated to: $new_base_url"
                
                # Update Claude settings if this is the current model
                local current_model
                current_model=$(get_current_model)
                if [ "$model_key" = "$current_model" ]; then
                    log_info "Updating Claude settings for current model..."
                    update_claude_settings_from_model "$model_key"
                fi
            fi
            ;;
        3)
            read -p "🔑 Enter new API key URL (current: $current_api_key_url): " new_api_key_url
            if [ -n "$new_api_key_url" ]; then
                node -e "
                    const fs = require('fs');
                    const config = JSON.parse(fs.readFileSync('$MODELS_CONFIG_FILE', 'utf-8'));
                    config.models['$model_key'].api_key_url = '$new_api_key_url';
                    fs.writeFileSync('$MODELS_CONFIG_FILE', JSON.stringify(config, null, 2));
                " 2>/dev/null
                log_success "API Key URL updated to: $new_api_key_url"
            fi
            ;;
        4)
            read -p "📝 Enter new model name (current: $current_name): " new_name
            read -p "🔗 Enter new base URL (current: $current_base_url): " new_base_url
            read -p "🔑 Enter new API key URL (current: $current_api_key_url): " new_api_key_url
            
            node -e "
                const fs = require('fs');
                const config = JSON.parse(fs.readFileSync('$MODELS_CONFIG_FILE', 'utf-8'));
                if ('$new_name') config.models['$model_key'].name = '$new_name';
                if ('$new_base_url') config.models['$model_key'].base_url = '$new_base_url';
                if ('$new_api_key_url') config.models['$model_key'].api_key_url = '$new_api_key_url';
                fs.writeFileSync('$MODELS_CONFIG_FILE', JSON.stringify(config, null, 2));
            " 2>/dev/null
            
            log_success "Model '$model_key' updated successfully"
            
            # Update Claude settings if this is the current model
            local current_model
            current_model=$(get_current_model)
            if [ "$model_key" = "$current_model" ]; then
                log_info "Updating Claude settings for current model..."
                update_claude_settings_from_model "$model_key"
            fi
            ;;
        5|*)
            log_info "Edit cancelled"
            return 0
            ;;
    esac
    
    chmod 600 "$MODELS_CONFIG_FILE"
}

add_custom_model() {
    echo ""
    echo "➕ Add Custom Model"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    init_models_config
    
    read -p "🏷️  Enter model key (e.g., 'openai', 'claude-custom'): " model_key
    if [ -z "$model_key" ]; then
        log_error "Model key cannot be empty"
        return 1
    fi
    
    # Check if model key already exists
    local model_exists
    model_exists=$(node -e "
        const fs = require('fs');
        const config = JSON.parse(fs.readFileSync('$MODELS_CONFIG_FILE', 'utf-8'));
        console.log(config.models['$model_key'] ? 'true' : 'false');
    " 2>/dev/null)
    
    if [ "$model_exists" = "true" ]; then
        log_error "Model key '$model_key' already exists. Use --edit to modify existing models."
        return 1
    fi
    
    read -p "📝 Enter model name (e.g., 'OpenAI GPT-4'): " model_name
    if [ -z "$model_name" ]; then
        log_error "Model name cannot be empty"
        return 1
    fi
    
    read -p "🔗 Enter base URL (e.g., 'https://api.openai.com'): " base_url
    if [ -z "$base_url" ]; then
        log_error "Base URL cannot be empty"
        return 1
    fi
    
    # Validate URL format
    if ! validate_url "$base_url"; then
        log_warning "Base URL does not appear to be a valid HTTP/HTTPS URL"
        read -p "Continue anyway? (y/N): " continue_anyway
        if [[ ! "$continue_anyway" =~ ^[Yy]$ ]]; then
            log_info "Cancelled by user"
            return 1
        fi
    fi
    
    read -p "🔑 Enter API key URL (for documentation): " api_key_url
    if [ -z "$api_key_url" ]; then
        api_key_url="$base_url"
    fi
    
    # Add to models configuration
    node -e "
        const fs = require('fs');
        const config = JSON.parse(fs.readFileSync('$MODELS_CONFIG_FILE', 'utf-8'));
        config.models['$model_key'] = {
            name: '$model_name',
            base_url: '$base_url',
            api_key_url: '$api_key_url',
            api_key: '',
            active: false
        };
        fs.writeFileSync('$MODELS_CONFIG_FILE', JSON.stringify(config, null, 2));
    " 2>/dev/null
    
    chmod 600 "$MODELS_CONFIG_FILE"
    log_success "Custom model '$model_key' added successfully"
    
    # Ask if user wants to configure it now
    read -p "🔧 Do you want to configure the API key for this model now? (Y/n): " configure_now
    if [[ ! "$configure_now" =~ ^[Nn]$ ]]; then
        configure_model "$model_key"
    fi
}

test_claude_config() {
    log_info "Testing Claude configuration..."
    
    # 测试Claude是否能正常工作
    if command -v claude &>/dev/null; then
        # 首先检查版本命令是否工作
        if ! claude --version &>/dev/null; then
            log_info "Claude version check failed, configuration may be needed"
            return 1
        fi
        
        # 检查配置文件是否存在并包含必要信息
        if [ -f "$CONFIG_FILE" ]; then
            if grep -q "ANTHROPIC_AUTH_TOKEN" "$CONFIG_FILE" 2>/dev/null && \
               grep -q "ANTHROPIC_BASE_URL" "$CONFIG_FILE" 2>/dev/null; then
                log_success "Claude configuration test passed (✓)"
                
                # 提供可选的API连接测试
                echo ""
                local current_model
                local current_base_url
                current_model=$(get_current_model)
                current_base_url=$(get_model_info "$current_model" "base_url")
                
                echo "🔍 API Test Options:"
                echo "   Current Model: $current_model"
                echo "   API Endpoint: $current_base_url"
                echo ""
                echo "   1) Quick test (version check - recommended)"
                echo "   2) Full API test (may take longer, tests actual API calls)"
                echo "   3) Skip test"
                read -p "Choose test type (1-3, default: 1): " test_choice
                
                case "${test_choice:-1}" in
                    1)
                        log_info "Running quick connectivity test..."
                        if claude --version >/dev/null 2>&1; then
                            log_success "Quick test passed! Claude command is working ✨"
                            log_info "Note: This only tests if Claude is installed, not API connectivity"
                        else
                            log_info "Quick test failed. There may be configuration issues"
                            log_info "Try running 'claude --version' manually to diagnose"
                        fi
                        ;;
                    2)
                        log_info "Testing full API connectivity to: $current_base_url"
                        log_info "This may take up to 15 seconds..."
                        
                        # Simple test with timeout using background process
                        local test_pid
                        local temp_file="/tmp/claude_test_$$"
                        
                        # Start the test in background and capture output to file
                        (claude -p "respond with just 'OK'" > "$temp_file" 2>&1; echo $? > "${temp_file}.exit") &
                        test_pid=$!
                        
                        # Wait for up to 15 seconds with progress indicator
                        local timeout_count=0
                        local max_timeout=15
                        
                        echo -n "🔄 Testing API"
                        while [ $timeout_count -lt $max_timeout ]; do
                            if ! kill -0 $test_pid 2>/dev/null; then
                                # Process finished
                                wait $test_pid 2>/dev/null
                                break
                            fi
                            sleep 1
                            timeout_count=$((timeout_count + 1))
                            echo -n "."
                        done
                        echo ""
                        
                        if [ $timeout_count -ge $max_timeout ]; then
                            # Timeout occurred
                            kill $test_pid 2>/dev/null
                            wait $test_pid 2>/dev/null
                            log_info "❌ API test timed out after ${max_timeout} seconds"
                            log_info "Possible issues:"
                            log_info "   • Network connectivity to $current_base_url"
                            log_info "   • API key issues with $current_model model"
                            log_info "   • API endpoint problems"
                            log_info ""
                            log_info "💡 Troubleshooting:"
                            log_info "   • Check internet connection"
                            log_info "   • Verify API key: $0 --configure $current_model"
                            log_info "   • Try switching models: $0 --switch"
                        else
                            # Check exit code and output
                            local exit_code=1
                            if [ -f "${temp_file}.exit" ]; then
                                exit_code=$(cat "${temp_file}.exit" 2>/dev/null || echo "1")
                            fi
                            
                            if [ "$exit_code" = "0" ] && [ -f "$temp_file" ]; then
                                local response=$(cat "$temp_file" 2>/dev/null)
                                if [ -n "$response" ]; then
                                    log_success "✨ API connectivity test passed!"
                                    log_info "Response received from $current_model"
                                else
                                    log_info "⚠️  API responded but with empty response"
                                fi
                            else
                                log_info "❌ API test failed"
                                if [ -f "$temp_file" ]; then
                                    local error_msg=$(cat "$temp_file" 2>/dev/null)
                                    log_info "Error: $error_msg"
                                fi
                                log_info "You may need to check your API key or try a different model"
                            fi
                        fi
                        
                        # Cleanup temp files
                        rm -f "$temp_file" "${temp_file}.exit" 2>/dev/null
                        ;;
                    3|*)
                        log_info "Skipping API connectivity test"
                        ;;
                esac
                
                return 0
            else
                log_info "Claude config file incomplete"
                return 1
            fi
        else
            log_info "Claude config file not found"
            return 1
        fi
    else
        log_error "Claude command not found"
        return 1
    fi
}

# ========================
#   综合系统检查函数
# ========================

run_system_checks() {
    echo ""
    echo "🔍 System Compatibility Check"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 检查系统依赖
    check_system_dependencies
    
    # 检查 Node.js
    local node_needed=false
    if ! check_nodejs; then
        node_needed=true
    fi
    
    # 检查 Claude Code
    local claude_needed=false
    if ! check_claude_installation; then
        claude_needed=true
    fi
    
    # 检查 Claude 配置
    local config_needed=false
    if ! check_claude_config; then
        config_needed=true
    fi
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ "$node_needed" = false ] && [ "$claude_needed" = false ] && [ "$config_needed" = false ]; then
        log_success "All components are already installed and configured! 🎉"
        echo ""
        echo "🎯 What would you like to do next?"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "   1) Test current configuration"
        echo "   2) Manage models (switch, configure, add)"
        echo "   3) View all available models"
        echo "   4) Configure API key for current model"
        echo "   5) Switch to a different model"
        echo "   6) Add a new custom model"
        echo "   7) Show API key information"
        echo "   8) Exit (all set up and ready to use)"
        echo ""
        
        read -p "🤔 Please choose an option (1-8): " choice
        
        case $choice in
            1)
                test_claude_config
                ;;
            2)
                # Interactive model management
                interactive_model_management
                ;;
            3)
                list_models
                read -p "Press Enter to continue..."
                ;;
            4)
                local current_model
                current_model=$(get_current_model)
                configure_model "$current_model"
                ;;
            5)
                switch_model
                ;;
            6)
                add_custom_model
                ;;
            7)
                show_api_key_info
                read -p "Press Enter to continue..."
                ;;
            8|"")
                log_success "All set! Claude Code is ready to use."
                ;;
            *)
                log_info "Invalid option. Proceeding with current setup."
                ;;
        esac
        return 0
    else
        echo ""
        log_info "The following components need to be installed/configured:"
        [ "$node_needed" = true ] && echo "   • Node.js $NODE_MIN_VERSION+"
        [ "$claude_needed" = true ] && echo "   • Claude Code"
        [ "$config_needed" = true ] && echo "   • Claude Code configuration"
        echo ""
        read -p "🚀 Continue with installation? (Y/n): " continue_install
        if [[ "$continue_install" =~ ^[Nn]$ ]]; then
            log_info "Installation cancelled by user"
            exit 0
        fi
        return 1
    fi
}

# ========================
#     API Key 安全输入函数
# ========================

secure_read_api_key() {
    local api_key=""
    local confirm_key=""
    
    echo ""
    echo "🔐 API Key Configuration"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   Get your API key from: $API_KEY_URL"
    echo "   Your API key will be stored securely in ~/.claude/settings.json"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # 首次输入
    while true; do
        read -s -p "🔑 Please enter your ZHIPU API key: " api_key
        echo ""
        
        if [ -z "$api_key" ]; then
            log_error "API key cannot be empty. Please try again."
            continue
        fi
        
        # 基本格式验证
        if [[ ${#api_key} -lt 10 ]]; then
            log_error "API key seems too short. Please check and try again."
            continue
        fi
        
        # 确认输入
        read -s -p "🔑 Please confirm your API key: " confirm_key
        echo ""
        
        if [ "$api_key" = "$confirm_key" ]; then
            log_success "API key confirmed"
            break
        else
            log_error "API keys don't match. Please try again."
            api_key=""
            confirm_key=""
        fi
    done
    
    echo "$api_key"
}

# ========================
#     配置验证函数
# ========================

validate_api_key() {
    local api_key="$1"
    
    log_info "Validating API key format..."
    
    # 基本长度检查
    if [[ ${#api_key} -lt 10 ]]; then
        log_error "API key appears to be too short"
        return 1
    fi
    
    # 检查是否包含明显的占位符
    if [[ "$api_key" == *"your_api_key"* ]] || [[ "$api_key" == *"YOUR_API_KEY"* ]]; then
        log_error "Please replace the placeholder with your actual API key"
        return 1
    fi
    
    log_success "API key format validation passed"
    return 0
}

# ========================
#     API Key 配置
# ========================

configure_claude() {
    # 检查是否已有配置
    if check_claude_config; then
        echo ""
        read -p "🤔 Claude Code is already configured. Do you want to reconfigure? (y/N): " reconfigure
        if [[ ! "$reconfigure" =~ ^[Yy]$ ]]; then
            log_success "Using existing configuration"
            return 0
        fi
    fi
    
    # 安全输入API key
    local api_key
    api_key=$(secure_read_api_key)
    
    # 验证API key
    if ! validate_api_key "$api_key"; then
        log_error "API key validation failed. Please run the script again."
        exit 1
    fi

    ensure_dir_exists "$CONFIG_DIR"

    # 写入配置文件
    log_info "Writing configuration to $CONFIG_FILE..."
    node --eval '
        const os = require("os");
        const fs = require("fs");
        const path = require("path");

        const homeDir = os.homedir();
        const filePath = path.join(homeDir, ".claude", "settings.json");
        const apiKey = "'"$api_key"'";

        const content = fs.existsSync(filePath)
            ? JSON.parse(fs.readFileSync(filePath, "utf-8"))
            : {};

        fs.writeFileSync(filePath, JSON.stringify({
            ...content,
            env: {
                ANTHROPIC_AUTH_TOKEN: apiKey,
                ANTHROPIC_BASE_URL: "'"$API_BASE_URL"'",
                API_TIMEOUT_MS: "'"$API_TIMEOUT_MS"'",
            }
        }, null, 2), "utf-8");
    ' || {
        log_error "Failed to write settings.json"
        exit 1
    }

    # 设置文件权限为仅用户可读写
    chmod 600 "$CONFIG_FILE" 2>/dev/null || log_info "Could not set strict permissions on config file"

    log_success "Claude Code configured successfully"
    
    # 配置环境变量作为备用方案
    configure_environment_variables "$api_key"
    
    # 清理敏感变量
    unset api_key
}

# ========================
#   Interactive Model Management
# ========================

interactive_model_management() {
    local current_model
    current_model=$(get_current_model)
    
    echo ""
    echo "🤖 Current Model Status"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Show current model status
    local current_model_name
    local current_api_key
    current_model_name=$(get_model_info "$current_model" "name")
    current_api_key=$(get_model_info "$current_model" "api_key")
    
    if [ -n "$current_api_key" ] && [ "$current_api_key" != "your-api-key-here" ]; then
        local masked_key="${current_api_key:0:8}..."
        echo "   ✅ Active: $current_model ($current_model_name)"
        echo "   🔑 API Key: $masked_key (configured)"
        echo "   🌐 Base URL: $(get_model_info "$current_model" "base_url")"
    else
        echo "   ⚠️  Active: $current_model ($current_model_name)"
        echo "   🔑 API Key: Not configured"
        echo "   🌐 Base URL: $(get_model_info "$current_model" "base_url")"
    fi
    
    echo ""
    echo "🔧 What would you like to do?"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   1) Continue with current model ($current_model)"
    echo "   2) Switch to a different model"
    echo "   3) Configure API key for current model"
    echo "   4) View all available models"
    echo "   5) Advanced configuration menu"
    echo "   6) Test current configuration"
    echo ""
    
    read -p "🤔 Please choose an option (1-6): " choice
    
    case $choice in
        1)
            log_success "Continuing with current model: $current_model"
            ;;
        2)
            echo ""
            echo "🔄 Switch Model"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            list_models
            echo ""
            read -p "🔧 Enter model key to switch to (zhipu/anthropic): " target_model
            if [ -n "$target_model" ]; then
                switch_model "$target_model"
                
                # Check if new model needs API key configuration
                local new_api_key
                new_api_key=$(get_model_info "$target_model" "api_key")
                if [ -z "$new_api_key" ] || [ "$new_api_key" = "your-api-key-here" ]; then
                    echo ""
                    read -p "🔑 The switched model needs API key configuration. Configure it now? (Y/n): " configure_new
                    if [[ ! "$configure_new" =~ ^[Nn]$ ]]; then
                        configure_model "$target_model"
                    fi
                fi
            else
                log_info "No model specified, keeping current model"
            fi
            ;;
        3)
            echo ""
            log_info "Configuring API key for current model: $current_model"
            configure_model "$current_model"
            ;;
        4)
            echo ""
            list_models
            read -p "Press Enter to continue..."
            interactive_model_management
            ;;
        5)
            manage_claude_config
            ;;
        6)
            echo ""
            test_claude_config
            read -p "Press Enter to continue..."
            ;;
        *)
            log_info "Invalid option, continuing with current model: $current_model"
            ;;
    esac
}

# ========================
#        主流程
# ========================

main() {
    # Initialize models configuration
    init_models_config
    
    # Load current model settings
    CURRENT_MODEL=$(get_current_model)
    API_BASE_URL=$(get_model_info "$CURRENT_MODEL" "base_url")
    API_KEY_URL=$(get_model_info "$CURRENT_MODEL" "api_key_url")
    
    # Check for command line arguments
    case "${1:-}" in
        --help|-h)
            echo "🚀 Claude Code Installation & Configuration Script v$SCRIPT_VERSION"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --help, -h         Show this help message"
            echo "  --version, -v      Show script version"
            echo "  --info, -i         Show API key information"
            echo "  --config, -c       Open configuration management"
            echo "  --test, -t         Test Claude configuration"
            echo "  --models, -m       List available models"
            echo "  --switch MODEL     Switch to specified model"
            echo "  --configure MODEL  Configure API key for specified model"
            echo ""
            echo "Environment Variables:"
            echo "  DEBUG=1            Enable debug logging"
            echo ""
            echo "Examples:"
            echo "  $0                    # Run full installation/check"
            echo "  $0 --info             # Show API key information"
            echo "  $0 --config           # Manage configuration"
            echo "  $0 --models           # List available models"
            echo "  $0 --switch zhipu     # Switch to ZHIPU model"
            echo "  $0 --switch anthropic # Switch to Anthropic model"
            echo "  $0 --switch k2        # Switch to Kimi K2 model"
            echo "  $0 --configure zhipu  # Configure ZHIPU API key"
            exit 0
            ;;
        --version|-v)
            echo "Claude Code Installation Script v$SCRIPT_VERSION"
            exit 0
            ;;
        --info|-i)
            show_api_key_info
            exit 0
            ;;
        --config|-c)
            manage_claude_config
            exit 0
            ;;
        --test|-t)
            test_claude_config
            exit 0
            ;;
        --models|-m)
            list_models
            exit 0
            ;;
        --switch)
            if [ -n "${2:-}" ]; then
                switch_model "$2"
            else
                switch_model
            fi
            exit 0
            ;;
        --configure)
            if [ -n "${2:-}" ]; then
                configure_model "$2"
            else
                configure_model
            fi
            exit 0
            ;;
    esac

    echo "🚀 Claude Code Installation & Configuration Script v$SCRIPT_VERSION"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "   Script: $SCRIPT_NAME"
    echo "   Target: Claude Code v$CLAUDE_PACKAGE"
    echo "   Platform: $(uname -s) $(uname -m)"
    echo "   Current Model: $CURRENT_MODEL ($(get_model_info "$CURRENT_MODEL" "name"))"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # 运行系统检查
    if run_system_checks; then
        # 所有组件都已安装并配置
        echo ""
        log_success "✨ Setup completed! Claude Code is ready to use."
        echo ""
        
        # Interactive model management
        interactive_model_management
        
        echo ""
        echo "🚀 You can now start using Claude Code with:"
        echo "   claude"
        echo ""
        echo "🔧 Quick Access:"
        echo "   $0 --models           # List available models"
        echo "   $0 --switch MODEL     # Switch between models"
        echo "   $0 --configure MODEL  # Configure model API key"
        echo "   $0 --config           # Full configuration management"
        echo ""
        exit 0
    fi

    echo ""
    echo "🔧 Installation Process"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # 安装必要组件
    check_nodejs
    install_claude_code
    configure_claude_json
    
    # Interactive model selection and configuration
    echo ""
    echo "🤖 Model Selection & Configuration"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Claude Code supports multiple LLM providers. Please choose your preferred model:"
    echo ""
    echo "Available Models:"
    echo "   1) ZHIPU AI (智谱AI) - Chinese AI provider"
    echo "      • Base URL: $zhipu_base_url"
    echo "      • Get API key: $zhipu_api_url"
    echo ""
    echo "   2) Anthropic (Official) - Original Claude provider"
    echo "      • Base URL: $anthropic_base_url"
    echo "      • Get API key: $anthropic_api_url"
    echo ""
    echo "   3) Kimi K2 - Advanced AI model"
    echo "      • Base URL: $k2_base_url"
    echo "      • Get API key: $k2_api_url"
    echo ""
    
    read -p "🔧 Please choose your preferred model (1-3, default: 1): " model_choice
    
    case "${model_choice:-1}" in
        1)
            CURRENT_MODEL="zhipu"
            log_success "Selected: ZHIPU AI (智谱AI)"
            ;;
        2)
            CURRENT_MODEL="anthropic"
            log_success "Selected: Anthropic (Official)"
            ;;
        3)
            CURRENT_MODEL="k2"
            log_success "Selected: Kimi K2"
            ;;
        *)
            CURRENT_MODEL="zhipu"
            log_info "Invalid choice, defaulting to: ZHIPU AI (智谱AI)"
            ;;
    esac
    
    # Update current model in configuration
    switch_model "$CURRENT_MODEL"
    
    # Configure API key for selected model
    configure_model "$CURRENT_MODEL"
    
    echo ""
    echo "✅ Testing Configuration"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # 测试配置是否工作
    if ! test_claude_config; then
        log_info "Configuration test failed. You may need to:"
        echo "   1. Restart your terminal"
        echo "   2. Or manually set environment variables if needed"
        echo "   3. Check ~/.claude/settings.json for configuration"
    fi

    echo ""
    echo "🎉 Installation Summary"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_success "Installation completed successfully!"
    echo ""
    echo "🚀 You can now start using Claude Code with:"
    echo "   claude"
    echo ""
    echo "📖 Quick Commands:"
    echo "   claude --help                 Show help"
    echo "   claude --version              Show version"
    echo "   claude 'Hello, Claude!'       Quick question"
    echo "   claude                        Interactive mode"
    echo ""
    echo "🤖 Model Management:"
    echo "   $0 --models                   List available models"
    echo "   $0 --switch zhipu             Switch to ZHIPU model"
    echo "   $0 --switch anthropic         Switch to Anthropic model"
    echo "   $0 --switch k2                Switch to Kimi K2 model"
    echo "   $0 --configure MODEL          Configure model API key"
    echo ""
    echo "🔧 Script Management:"
    echo "   $0 --info                     Show API key information"
    echo "   $0 --config                   Complete configuration management"
    echo "   $0 --test                     Test configuration"
    echo ""
    echo "🔒 Security Notes:"
    echo "   • Your API keys are stored in ~/.claude/models.json (secure)"
    echo "   • File permissions are set to 600 (user read/write only)"
    echo "   • Environment variables are configured as fallback"
    echo "   • Keep your API keys private and never commit them to version control"
    echo ""
    echo "🆘 Need Help?"
    echo "   • Model info: $0 --models"
    echo "   • API key info: $0 --info"
    echo "   • Full management: $0 --config"
    echo "   • Verify API keys at respective provider websites"
    echo ""
}

main "$@"
