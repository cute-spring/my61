# AI智能评分系统 - 示例评分标准

本文档提供了多个领域的评分标准模板，用于测试AI智能评分系统的功能。

## 1. 代码质量评分标准

### 1.1 JavaScript代码评分标准

```json
{
  "id": "code-quality-javascript",
  "name": "JavaScript代码质量评分标准",
  "description": "用于评估JavaScript代码的质量、可读性、性能和最佳实践",
  "version": "1.0",
  "categories": [
    {
      "name": "代码结构和组织",
      "description": "评估代码的整体结构、模块化和组织方式",
      "weight": 0.2,
      "criteria": [
        {
          "name": "模块化设计",
          "description": "代码是否合理模块化，职责分离清晰",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "优秀的模块化设计，职责分离非常清晰，代码组织结构合理"
            },
            {
              "score": 4,
              "description": "良好的模块化设计，职责分离较清晰"
            },
            {
              "score": 3,
              "description": "基本的模块化设计，职责分离一般"
            },
            {
              "score": 2,
              "description": "模块化设计不足，职责分离不够清晰"
            },
            {
              "score": 1,
              "description": "缺乏模块化设计，代码混乱"
            }
          ]
        },
        {
          "name": "代码复用性",
          "description": "代码的复用程度和通用性",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "代码高度可复用，提供通用组件和工具函数"
            },
            {
              "score": 4,
              "description": "代码复用性良好，有可复用的组件"
            },
            {
              "score": 3,
              "description": "代码复用性一般，有一定的复用设计"
            },
            {
              "score": 2,
              "description": "代码复用性较差，重复代码较多"
            },
            {
              "score": 1,
              "description": "代码不可复用，大量重复代码"
            }
          ]
        },
        {
          "name": "文件组织",
          "description": "文件结构是否合理，命名是否规范",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "文件结构非常合理，命名规范统一"
            },
            {
              "score": 4,
              "description": "文件结构合理，命名规范"
            },
            {
              "score": 3,
              "description": "文件结构基本合理，命名基本规范"
            },
            {
              "score": 2,
              "description": "文件结构不够合理，命名不够规范"
            },
            {
              "score": 1,
              "description": "文件结构混乱，命名不规范"
            }
          ]
        }
      ]
    },
    {
      "name": "代码可读性",
      "description": "评估代码的可读性、命名规范和注释质量",
      "weight": 0.25,
      "criteria": [
        {
          "name": "命名规范",
          "description": "变量、函数、类等命名是否清晰、规范",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "命名非常清晰、准确，完全符合命名规范"
            },
            {
              "score": 4,
              "description": "命名清晰、准确，符合命名规范"
            },
            {
              "score": 3,
              "description": "命名基本清晰，基本符合命名规范"
            },
            {
              "score": 2,
              "description": "命名不够清晰，部分不符合命名规范"
            },
            {
              "score": 1,
              "description": "命名混乱，不符合命名规范"
            }
          ]
        },
        {
          "name": "注释质量",
          "description": "注释的完整性、准确性和有用性",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "注释完整、准确，对理解代码很有帮助"
            },
            {
              "score": 4,
              "description": "注释完整、准确，有助于理解代码"
            },
            {
              "score": 3,
              "description": "注释基本完整，基本准确"
            },
            {
              "score": 2,
              "description": "注释不够完整，准确性一般"
            },
            {
              "score": 1,
              "description": "注释很少或不准确"
            }
          ]
        },
        {
          "name": "代码格式",
          "description": "代码格式是否统一、缩进是否规范",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "代码格式非常规范，完全符合格式要求"
            },
            {
              "score": 4,
              "description": "代码格式规范，符合格式要求"
            },
            {
              "score": 3,
              "description": "代码格式基本规范"
            },
            {
              "score": 2,
              "description": "代码格式不够规范"
            },
            {
              "score": 1,
              "description": "代码格式混乱"
            }
          ]
        }
      ]
    },
    {
      "name": "性能和效率",
      "description": "评估代码的性能、算法效率和资源使用",
      "weight": 0.2,
      "criteria": [
        {
          "name": "算法效率",
          "description": "算法选择是否合适，时间复杂度是否合理",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "算法选择非常合适，时间复杂度最优"
            },
            {
              "score": 4,
              "description": "算法选择合适，时间复杂度合理"
            },
            {
              "score": 3,
              "description": "算法选择基本合适，时间复杂度尚可"
            },
            {
              "score": 2,
              "description": "算法选择不够合适，时间复杂度较高"
            },
            {
              "score": 1,
              "description": "算法选择不合适，时间复杂度很高"
            }
          ]
        },
        {
          "name": "内存使用",
          "description": "内存使用是否合理，是否有内存泄漏风险",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "内存使用非常合理，无内存泄漏风险"
            },
            {
              "score": 4,
              "description": "内存使用合理，基本无内存泄漏风险"
            },
            {
              "score": 3,
              "description": "内存使用基本合理"
            },
            {
              "score": 2,
              "description": "内存使用不够合理"
            },
            {
              "score": 1,
              "description": "内存使用不合理，有内存泄漏风险"
            }
          ]
        },
        {
          "name": "代码优化",
          "description": "代码是否经过优化，是否有不必要的计算",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "代码经过充分优化，无冗余计算"
            },
            {
              "score": 4,
              "description": "代码经过优化，基本无冗余计算"
            },
            {
              "score": 3,
              "description": "代码基本优化，有少量冗余计算"
            },
            {
              "score": 2,
              "description": "代码优化不足，有较多冗余计算"
            },
            {
              "score": 1,
              "description": "代码未优化，大量冗余计算"
            }
          ]
        }
      ]
    },
    {
      "name": "错误处理和健壮性",
      "description": "评估代码的错误处理机制和健壮性",
      "weight": 0.2,
      "criteria": [
        {
          "name": "异常处理",
          "description": "是否正确处理异常情况",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "异常处理非常完善，覆盖所有可能的异常"
            },
            {
              "score": 4,
              "description": "异常处理完善，覆盖大部分异常情况"
            },
            {
              "score": 3,
              "description": "异常处理基本完善"
            },
            {
              "score": 2,
              "description": "异常处理不够完善"
            },
            {
              "score": 1,
              "description": "缺乏异常处理"
            }
          ]
        },
        {
          "name": "输入验证",
          "description": "是否对输入数据进行充分验证",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "输入验证非常充分，安全性很高"
            },
            {
              "score": 4,
              "description": "输入验证充分，安全性良好"
            },
            {
              "score": 3,
              "description": "输入验证基本充分"
            },
            {
              "score": 2,
              "description": "输入验证不够充分"
            },
            {
              "score": 1,
              "description": "缺乏输入验证"
            }
          ]
        },
        {
          "name": "边界条件处理",
          "description": "是否正确处理边界条件和特殊情况",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "边界条件处理非常完善"
            },
            {
              "score": 4,
              "description": "边界条件处理完善"
            },
            {
              "score": 3,
              "description": "边界条件处理基本完善"
            },
            {
              "score": 2,
              "description": "边界条件处理不够完善"
            },
            {
              "score": 1,
              "description": "缺乏边界条件处理"
            }
          ]
        }
      ]
    },
    {
      "name": "安全性",
      "description": "评估代码的安全性和防护措施",
      "weight": 0.15,
      "criteria": [
        {
          "name": "SQL注入防护",
          "description": "是否防止SQL注入攻击",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "完全防止SQL注入，使用参数化查询"
            },
            {
              "score": 4,
              "description": "有效防止SQL注入"
            },
            {
              "score": 3,
              "description": "基本防止SQL注入"
            },
            {
              "score": 2,
              "description": "SQL注入防护不足"
            },
            {
              "score": 1,
              "description": "存在SQL注入漏洞"
            }
          ]
        },
        {
          "name": "XSS防护",
          "description": "是否防止XSS攻击",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "完全防止XSS攻击，输出编码完善"
            },
            {
              "score": 4,
              "description": "有效防止XSS攻击"
            },
            {
              "score": 3,
              "description": "基本防止XSS攻击"
            },
            {
              "score": 2,
              "description": "XSS防护不足"
            },
            {
              "score": 1,
              "description": "存在XSS漏洞"
            }
          ]
        },
        {
          "name": "数据安全",
          "description": "敏感数据是否得到保护",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "敏感数据保护非常完善"
            },
            {
              "score": 4,
              "description": "敏感数据保护完善"
            },
            {
              "score": 3,
              "description": "敏感数据保护基本完善"
            },
            {
              "score": 2,
              "description": "敏感数据保护不够完善"
            },
            {
              "score": 1,
              "description": "缺乏敏感数据保护"
            }
          ]
        }
      ]
    }
  ],
  "totalWeight": 1.0,
  "metadata": {
    "author": "AI评分系统",
    "isTemplate": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "tags": ["代码质量", "JavaScript", "编程"]
  }
}
```

### 1.2 Python代码评分标准

```json
{
  "id": "code-quality-python",
  "name": "Python代码质量评分标准",
  "description": "用于评估Python代码的质量、可读性、性能和最佳实践",
  "version": "1.0",
  "categories": [
    {
      "name": "代码风格和规范",
      "description": "评估代码是否符合PEP8规范和Python最佳实践",
      "weight": 0.25,
      "criteria": [
        {
          "name": "PEP8规范",
          "description": "代码是否符合PEP8编码规范",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "完全符合PEP8规范，代码风格统一"
            },
            {
              "score": 4,
              "description": "基本符合PEP8规范"
            },
            {
              "score": 3,
              "description": "大部分符合PEP8规范"
            },
            {
              "score": 2,
              "description": "部分符合PEP8规范"
            },
            {
              "score": 1,
              "description": "不符合PEP8规范"
            }
          ]
        },
        {
          "name": "命名约定",
          "description": "变量、函数、类名是否符合Python命名约定",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "完全符合Python命名约定"
            },
            {
              "score": 4,
              "description": "基本符合Python命名约定"
            },
            {
              "score": 3,
              "description": "大部分符合Python命名约定"
            },
            {
              "score": 2,
              "description": "部分符合Python命名约定"
            },
            {
              "score": 1,
              "description": "不符合Python命名约定"
            }
          ]
        },
        {
          "name": "文档字符串",
          "description": "函数和类的文档字符串是否完整",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "文档字符串完整、准确、格式规范"
            },
            {
              "score": 4,
              "description": "文档字符串完整、准确"
            },
            {
              "score": 3,
              "description": "文档字符串基本完整"
            },
            {
              "score": 2,
              "description": "文档字符串不够完整"
            },
            {
              "score": 1,
              "description": "缺乏文档字符串"
            }
          ]
        }
      ]
    },
    {
      "name": "Python特性使用",
      "description": "评估是否合理使用Python语言特性",
      "weight": 0.2,
      "criteria": [
        {
          "name": "Pythonic代码",
          "description": "是否编写Pythonic风格的代码",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "代码非常Pythonic，充分利用语言特性"
            },
            {
              "score": 4,
              "description": "代码Pythonic风格良好"
            },
            {
              "score": 3,
              "description": "代码基本Pythonic"
            },
            {
              "score": 2,
              "description": "代码Pythonic风格不足"
            },
            {
              "score": 1,
              "description": "代码不够Pythonic"
            }
          ]
        },
        {
          "name": "内置函数使用",
          "description": "是否合理使用Python内置函数和库",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "充分利用Python内置函数和标准库"
            },
            {
              "score": 4,
              "description": "合理使用Python内置函数和标准库"
            },
            {
              "score": 3,
              "description": "基本使用Python内置函数和标准库"
            },
            {
              "score": 2,
              "description": "内置函数使用不够合理"
            },
            {
              "score": 1,
              "description": "未充分利用Python内置功能"
            }
          ]
        },
        {
          "name": "异常处理",
          "description": "是否使用Python的异常处理机制",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "异常处理非常完善，符合Python最佳实践"
            },
            {
              "score": 4,
              "description": "异常处理完善，符合Python习惯"
            },
            {
              "score": 3,
              "description": "异常处理基本完善"
            },
            {
              "score": 2,
              "description": "异常处理不够完善"
            },
            {
              "score": 1,
              "description": "缺乏异常处理"
            }
          ]
        }
      ]
    },
    {
      "name": "性能优化",
      "description": "评估Python代码的性能优化",
      "weight": 0.2,
      "criteria": [
        {
          "name": "数据结构选择",
          "description": "数据结构选择是否合适",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "数据结构选择非常合适，性能最优"
            },
            {
              "score": 4,
              "description": "数据结构选择合适"
            },
            {
              "score": 3,
              "description": "数据结构选择基本合适"
            },
            {
              "score": 2,
              "description": "数据结构选择不够合适"
            },
            {
              "score": 1,
              "description": "数据结构选择不合适"
            }
          ]
        },
        {
          "name": "算法复杂度",
          "description": "算法的时间复杂度是否合理",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "算法复杂度最优，性能非常好"
            },
            {
              "score": 4,
              "description": "算法复杂度合理，性能良好"
            },
            {
              "score": 3,
              "description": "算法复杂度尚可"
            },
            {
              "score": 2,
              "description": "算法复杂度较高"
            },
            {
              "score": 1,
              "description": "算法复杂度很高"
            }
          ]
        },
        {
          "name": "内存管理",
          "description": "内存使用是否合理",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "内存使用非常合理，无内存泄漏"
            },
            {
              "score": 4,
              "description": "内存使用合理"
            },
            {
              "score": 3,
              "description": "内存使用基本合理"
            },
            {
              "score": 2,
              "description": "内存使用不够合理"
            },
            {
              "score": 1,
              "description": "内存使用不合理"
            }
          ]
        }
      ]
    },
    {
      "name": "测试覆盖",
      "description": "评估代码的测试覆盖情况",
      "weight": 0.15,
      "criteria": [
        {
          "name": "单元测试",
          "description": "单元测试的完整性和质量",
          "weight": 0.5,
          "levels": [
            {
              "score": 5,
              "description": "单元测试非常完善，覆盖率>90%"
            },
            {
              "score": 4,
              "description": "单元测试完善，覆盖率>80%"
            },
            {
              "score": 3,
              "description": "单元测试基本完善，覆盖率>60%"
            },
            {
              "score": 2,
              "description": "单元测试不够完善，覆盖率<60%"
            },
            {
              "score": 1,
              "description": "缺乏单元测试"
            }
          ]
        },
        {
          "name": "测试质量",
          "description": "测试用例的质量和有效性",
          "weight": 0.5,
          "levels": [
            {
              "score": 5,
              "description": "测试用例质量非常高，覆盖各种情况"
            },
            {
              "score": 4,
              "description": "测试用例质量高，覆盖主要情况"
            },
            {
              "score": 3,
              "description": "测试用例质量一般"
            },
            {
              "score": 2,
              "description": "测试用例质量较差"
            },
            {
              "score": 1,
              "description": "测试用例质量很差"
            }
          ]
        }
      ]
    },
    {
      "name": "可维护性",
      "description": "评估代码的可维护性",
      "weight": 0.2,
      "criteria": [
        {
          "name": "代码复杂度",
          "description": "代码的复杂度和可理解性",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "代码复杂度低，非常容易理解"
            },
            {
              "score": 4,
              "description": "代码复杂度适中，容易理解"
            },
            {
              "score": 3,
              "description": "代码复杂度一般，基本可理解"
            },
            {
              "score": 2,
              "description": "代码复杂度较高，理解困难"
            },
            {
              "score": 1,
              "description": "代码复杂度很高，很难理解"
            }
          ]
        },
        {
          "name": "模块化程度",
          "description": "代码的模块化程度",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "模块化程度非常高，职责分离清晰"
            },
            {
              "score": 4,
              "description": "模块化程度高，职责分离清晰"
            },
            {
              "score": 3,
              "description": "模块化程度一般"
            },
            {
              "score": 2,
              "description": "模块化程度较低"
            },
            {
              "score": 1,
              "description": "模块化程度很低"
            }
          ]
        },
        {
          "name": "扩展性",
          "description": "代码的扩展性和灵活性",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "扩展性非常好，易于扩展新功能"
            },
            {
              "score": 4,
              "description": "扩展性良好"
            },
            {
              "score": 3,
              "description": "扩展性一般"
            },
            {
              "score": 2,
              "description": "扩展性较差"
            },
            {
              "score": 1,
              "description": "扩展性很差"
            }
          ]
        }
      ]
    }
  ],
  "totalWeight": 1.0,
  "metadata": {
    "author": "AI评分系统",
    "isTemplate": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "tags": ["代码质量", "Python", "编程"]
  }
}
```

## 2. 文档质量评分标准

### 2.1 技术文档评分标准

```json
{
  "id": "documentation-quality",
  "name": "技术文档质量评分标准",
  "description": "用于评估技术文档的质量、完整性和可用性",
  "version": "1.0",
  "categories": [
    {
      "name": "内容完整性",
      "description": "评估文档内容的完整性和覆盖面",
      "weight": 0.3,
      "criteria": [
        {
          "name": "信息覆盖",
          "description": "文档是否覆盖所有必要的信息",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "信息覆盖非常全面，包含所有必要细节"
            },
            {
              "score": 4,
              "description": "信息覆盖全面，包含主要细节"
            },
            {
              "score": 3,
              "description": "信息覆盖基本完整"
            },
            {
              "score": 2,
              "description": "信息覆盖不够完整"
            },
            {
              "score": 1,
              "description": "信息覆盖严重不足"
            }
          ]
        },
        {
          "name": "深度和细节",
          "description": "文档内容的深度和详细程度",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "内容深度适中，细节非常丰富"
            },
            {
              "score": 4,
              "description": "内容深度适中，细节丰富"
            },
            {
              "score": 3,
              "description": "内容深度基本合适，细节基本足够"
            },
            {
              "score": 2,
              "description": "内容深度不足，细节不够"
            },
            {
              "score": 1,
              "description": "内容深度严重不足，缺乏细节"
            }
          ]
        },
        {
          "name": "准确性",
          "description": "文档信息的准确性和时效性",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "信息非常准确，完全反映当前状态"
            },
            {
              "score": 4,
              "description": "信息准确，反映当前状态"
            },
            {
              "score": 3,
              "description": "信息基本准确"
            },
            {
              "score": 2,
              "description": "信息准确性一般"
            },
            {
              "score": 1,
              "description": "信息不准确或过时"
            }
          ]
        }
      ]
    },
    {
      "name": "结构和组织",
      "description": "评估文档的结构和逻辑组织",
      "weight": 0.25,
      "criteria": [
        {
          "name": "逻辑结构",
          "description": "文档的逻辑结构是否清晰",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "逻辑结构非常清晰，层次分明"
            },
            {
              "score": 4,
              "description": "逻辑结构清晰，层次分明"
            },
            {
              "score": 3,
              "description": "逻辑结构基本清晰"
            },
            {
              "score": 2,
              "description": "逻辑结构不够清晰"
            },
            {
              "score": 1,
              "description": "逻辑结构混乱"
            }
          ]
        },
        {
          "name": "章节组织",
          "description": "章节划分和组织是否合理",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "章节组织非常合理，过渡自然"
            },
            {
              "score": 4,
              "description": "章节组织合理，过渡自然"
            },
            {
              "score": 3,
              "description": "章节组织基本合理"
            },
            {
              "score": 2,
              "description": "章节组织不够合理"
            },
            {
              "score": 1,
              "description": "章节组织混乱"
            }
          ]
        },
        {
          "name": "导航性",
          "description": "文档的导航和查找是否方便",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "导航非常方便，查找信息很容易"
            },
            {
              "score": 4,
              "description": "导航方便，查找信息容易"
            },
            {
              "score": 3,
              "description": "导航基本方便"
            },
            {
              "score": 2,
              "description": "导航不够方便"
            },
            {
              "score": 1,
              "description": "导航困难，查找信息不便"
            }
          ]
        }
      ]
    },
    {
      "name": "可读性和语言",
      "description": "评估文档的可读性和语言表达",
      "weight": 0.25,
      "criteria": [
        {
          "name": "语言表达",
          "description": "语言表达是否清晰、准确",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "语言表达非常清晰、准确、专业"
            },
            {
              "score": 4,
              "description": "语言表达清晰、准确"
            },
            {
              "score": 3,
              "description": "语言表达基本清晰、准确"
            },
            {
              "score": 2,
              "description": "语言表达不够清晰"
            },
            {
              "score": 1,
              "description": "语言表达混乱，难以理解"
            }
          ]
        },
        {
          "name": "术语使用",
          "description": "术语使用是否准确、一致",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "术语使用非常准确、一致"
            },
            {
              "score": 4,
              "description": "术语使用准确、一致"
            },
            {
              "score": 3,
              "description": "术语使用基本准确、一致"
            },
            {
              "score": 2,
              "description": "术语使用不够准确或一致"
            },
            {
              "score": 1,
              "description": "术语使用混乱或不准确"
            }
          ]
        },
        {
          "name": "语法和拼写",
          "description": "语法和拼写是否正确",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "语法和拼写完全正确"
            },
            {
              "score": 4,
              "description": "语法和拼写基本正确"
            },
            {
              "score": 3,
              "description": "语法和拼写有小错误"
            },
            {
              "score": 2,
              "description": "语法和拼写错误较多"
            },
            {
              "score": 1,
              "description": "语法和拼写错误很多"
            }
          ]
        }
      ]
    },
    {
      "name": "可用性和实用性",
      "description": "评估文档的实用价值和可用性",
      "weight": 0.2,
      "criteria": [
        {
          "name": "实用性",
          "description": "文档的实际应用价值",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "实用性非常高，对用户很有帮助"
            },
            {
              "score": 4,
              "description": "实用性高，对用户有帮助"
            },
            {
              "score": 3,
              "description": "实用性一般"
            },
            {
              "score": 2,
              "description": "实用性较低"
            },
            {
              "score": 1,
              "description": "实用性很低"
            }
          ]
        },
        {
          "name": "示例和图表",
          "description": "示例和图表的质量和有用性",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "示例和图表非常丰富、有用"
            },
            {
              "score": 4,
              "description": "示例和图表丰富、有用"
            },
            {
              "score": 3,
              "description": "示例和图表基本有用"
            },
            {
              "score": 2,
              "description": "示例和图表较少或质量不高"
            },
            {
              "score": 1,
              "description": "缺乏示例和图表"
            }
          ]
        },
        {
          "name": "目标受众",
          "description": "是否明确针对目标受众",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "非常明确针对目标受众，内容恰到好处"
            },
            {
              "score": 4,
              "description": "明确针对目标受众"
            },
            {
              "score": 3,
              "description": "基本针对目标受众"
            },
            {
              "score": 2,
              "description": "目标受众不够明确"
            },
            {
              "score": 1,
              "description": "目标受众不明确"
            }
          ]
        }
      ]
    }
  ],
  "totalWeight": 1.0,
  "metadata": {
    "author": "AI评分系统",
    "isTemplate": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "tags": ["文档质量", "技术文档", "写作"]
  }
}
```

## 3. 项目计划评分标准

### 3.1 项目管理评分标准

```json
{
  "id": "project-plan-quality",
  "name": "项目计划质量评分标准",
  "description": "用于评估项目计划的质量、完整性和可行性",
  "version": "1.0",
  "categories": [
    {
      "name": "计划完整性",
      "description": "评估项目计划的完整性和覆盖面",
      "weight": 0.3,
      "criteria": [
        {
          "name": "目标明确性",
          "description": "项目目标是否明确、可衡量",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "目标非常明确、具体、可衡量"
            },
            {
              "score": 4,
              "description": "目标明确、可衡量"
            },
            {
              "score": 3,
              "description": "目标基本明确"
            },
            {
              "score": 2,
              "description": "目标不够明确"
            },
            {
              "score": 1,
              "description": "目标模糊或不明确"
            }
          ]
        },
        {
          "name": "范围定义",
          "description": "项目范围定义是否清晰",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "范围定义非常清晰，边界明确"
            },
            {
              "score": 4,
              "description": "范围定义清晰，边界明确"
            },
            {
              "score": 3,
              "description": "范围定义基本清晰"
            },
            {
              "score": 2,
              "description": "范围定义不够清晰"
            },
            {
              "score": 1,
              "description": "范围定义模糊"
            }
          ]
        },
        {
          "name": "交付物定义",
          "description": "项目交付物是否明确定义",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "交付物定义非常明确、具体"
            },
            {
              "score": 4,
              "description": "交付物定义明确、具体"
            },
            {
              "score": 3,
              "description": "交付物定义基本明确"
            },
            {
              "score": 2,
              "description": "交付物定义不够明确"
            },
            {
              "score": 1,
              "description": "交付物定义不明确"
            }
          ]
        }
      ]
    },
    {
      "name": "时间规划",
      "description": "评估时间安排的合理性和可行性",
      "weight": 0.25,
      "criteria": [
        {
          "name": "时间估算",
          "description": "时间估算是否合理",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "时间估算非常合理，有充分依据"
            },
            {
              "score": 4,
              "description": "时间估算合理，有依据"
            },
            {
              "score": 3,
              "description": "时间估算基本合理"
            },
            {
              "score": 2,
              "description": "时间估算不够合理"
            },
            {
              "score": 1,
              "description": "时间估算不合理"
            }
          ]
        },
        {
          "name": "里程碑设置",
          "description": "里程碑设置是否合理",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "里程碑设置非常合理，关键节点明确"
            },
            {
              "score": 4,
              "description": "里程碑设置合理，关键节点明确"
            },
            {
              "score": 3,
              "description": "里程碑设置基本合理"
            },
            {
              "score": 2,
              "description": "里程碑设置不够合理"
            },
            {
              "score": 1,
              "description": "里程碑设置不合理"
            }
          ]
        },
        {
          "name": "依赖关系",
          "description": "任务依赖关系是否清晰",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "依赖关系非常清晰，考虑周全"
            },
            {
              "score": 4,
              "description": "依赖关系清晰，考虑周全"
            },
            {
              "score": 3,
              "description": "依赖关系基本清晰"
            },
            {
              "score": 2,
              "description": "依赖关系不够清晰"
            },
            {
              "score": 1,
              "description": "依赖关系混乱"
            }
          ]
        }
      ]
    },
    {
      "name": "资源规划",
      "description": "评估资源规划的合理性和充分性",
      "weight": 0.2,
      "criteria": [
        {
          "name": "人力资源",
          "description": "人力资源规划是否合理",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "人力资源规划非常合理，技能匹配"
            },
            {
              "score": 4,
              "description": "人力资源规划合理，技能匹配"
            },
            {
              "score": 3,
              "description": "人力资源规划基本合理"
            },
            {
              "score": 2,
              "description": "人力资源规划不够合理"
            },
            {
              "score": 1,
              "description": "人力资源规划不合理"
            }
          ]
        },
        {
          "name": "预算规划",
          "description": "预算规划是否合理",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "预算规划非常合理，详细准确"
            },
            {
              "score": 4,
              "description": "预算规划合理，详细准确"
            },
            {
              "score": 3,
              "description": "预算规划基本合理"
            },
            {
              "score": 2,
              "description": "预算规划不够合理"
            },
            {
              "score": 1,
              "description": "预算规划不合理"
            }
          ]
        },
        {
          "name": "设备资源",
          "description": "设备资源规划是否充分",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "设备资源规划非常充分"
            },
            {
              "score": 4,
              "description": "设备资源规划充分"
            },
            {
              "score": 3,
              "description": "设备资源规划基本充分"
            },
            {
              "score": 2,
              "description": "设备资源规划不够充分"
            },
            {
              "score": 1,
              "description": "设备资源规划不充分"
            }
          ]
        }
      ]
    },
    {
      "name": "风险管理",
      "description": "评估风险管理的完整性和有效性",
      "weight": 0.15,
      "criteria": [
        {
          "name": "风险识别",
          "description": "风险识别是否全面",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "风险识别非常全面，覆盖各种可能性"
            },
            {
              "score": 4,
              "description": "风险识别全面，覆盖主要风险"
            },
            {
              "score": 3,
              "description": "风险识别基本全面"
            },
            {
              "score": 2,
              "description": "风险识别不够全面"
            },
            {
              "score": 1,
              "description": "风险识别不全面"
            }
          ]
        },
        {
          "name": "应对策略",
          "description": "风险应对策略是否有效",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "应对策略非常有效，考虑周全"
            },
            {
              "score": 4,
              "description": "应对策略有效，考虑周全"
            },
            {
              "score": 3,
              "description": "应对策略基本有效"
            },
            {
              "score": 2,
              "description": "应对策略不够有效"
            },
            {
              "score": 1,
              "description": "应对策略无效"
            }
          ]
        },
        {
          "name": "监控机制",
          "description": "风险监控机制是否健全",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "监控机制非常健全，及时预警"
            },
            {
              "score": 4,
              "description": "监控机制健全，及时预警"
            },
            {
              "score": 3,
              "description": "监控机制基本健全"
            },
            {
              "score": 2,
              "description": "监控机制不够健全"
            },
            {
              "score": 1,
              "description": "缺乏监控机制"
            }
          ]
        }
      ]
    },
    {
      "name": "质量控制",
      "description": "评估质量控制措施的充分性",
      "weight": 0.1,
      "criteria": [
        {
          "name": "质量标准",
          "description": "质量标准是否明确",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "质量标准非常明确、具体"
            },
            {
              "score": 4,
              "description": "质量标准明确、具体"
            },
            {
              "score": 3,
              "description": "质量标准基本明确"
            },
            {
              "score": 2,
              "description": "质量标准不够明确"
            },
            {
              "score": 1,
              "description": "质量标准不明确"
            }
          ]
        },
        {
          "name": "检查点",
          "description": "质量检查点设置是否合理",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "检查点设置非常合理，覆盖关键环节"
            },
            {
              "score": 4,
              "description": "检查点设置合理，覆盖关键环节"
            },
            {
              "score": 3,
              "description": "检查点设置基本合理"
            },
            {
              "score": 2,
              "description": "检查点设置不够合理"
            },
            {
              "score": 1,
              "description": "检查点设置不合理"
            }
          ]
        },
        {
          "name": "改进机制",
          "description": "质量改进机制是否健全",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "改进机制非常健全，持续优化"
            },
            {
              "score": 4,
              "description": "改进机制健全，持续优化"
            },
            {
              "score": 3,
              "description": "改进机制基本健全"
            },
            {
              "score": 2,
              "description": "改进机制不够健全"
            },
            {
              "score": 1,
              "description": "缺乏改进机制"
            }
          ]
        }
      ]
    }
  ],
  "totalWeight": 1.0,
  "metadata": {
    "author": "AI评分系统",
    "isTemplate": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "tags": ["项目管理", "项目计划", "规划"]
  }
}
```

## 4. 产品需求评分标准

### 4.1 产品需求质量评分标准

```json
{
  "id": "product-requirement-quality",
  "name": "产品需求质量评分标准",
  "description": "用于评估产品需求文档的质量、完整性和可行性",
  "version": "1.0",
  "categories": [
    {
      "name": "需求完整性",
      "description": "评估需求文档的完整性和覆盖面",
      "weight": 0.3,
      "criteria": [
        {
          "name": "功能需求",
          "description": "功能需求是否完整、清晰",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "功能需求非常完整、清晰、具体"
            },
            {
              "score": 4,
              "description": "功能需求完整、清晰、具体"
            },
            {
              "score": 3,
              "description": "功能需求基本完整、清晰"
            },
            {
              "score": 2,
              "description": "功能需求不够完整或清晰"
            },
            {
              "score": 1,
              "description": "功能需求严重缺失或模糊"
            }
          ]
        },
        {
          "name": "非功能需求",
          "description": "非功能需求是否完整",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "非功能需求非常完整、详细"
            },
            {
              "score": 4,
              "description": "非功能需求完整、详细"
            },
            {
              "score": 3,
              "description": "非功能需求基本完整"
            },
            {
              "score": 2,
              "description": "非功能需求不够完整"
            },
            {
              "score": 1,
              "description": "非功能需求严重缺失"
            }
          ]
        },
        {
          "name": "用户场景",
          "description": "用户场景和使用流程是否完整",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "用户场景非常完整，覆盖各种使用情况"
            },
            {
              "score": 4,
              "description": "用户场景完整，覆盖主要使用情况"
            },
            {
              "score": 3,
              "description": "用户场景基本完整"
            },
            {
              "score": 2,
              "description": "用户场景不够完整"
            },
            {
              "score": 1,
              "description": "用户场景严重缺失"
            }
          ]
        }
      ]
    },
    {
      "name": "需求质量",
      "description": "评估需求的质量和可测试性",
      "weight": 0.25,
      "criteria": [
        {
          "name": "可测试性",
          "description": "需求是否可测试、可验证",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "需求非常容易测试和验证"
            },
            {
              "score": 4,
              "description": "需求容易测试和验证"
            },
            {
              "score": 3,
              "description": "需求基本可测试和验证"
            },
            {
              "score": 2,
              "description": "需求可测试性较差"
            },
            {
              "score": 1,
              "description": "需求难以测试和验证"
            }
          ]
        },
        {
          "name": "优先级",
          "description": "需求优先级是否明确、合理",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "优先级非常明确、合理，有充分依据"
            },
            {
              "score": 4,
              "description": "优先级明确、合理，有依据"
            },
            {
              "score": 3,
              "description": "优先级基本明确、合理"
            },
            {
              "score": 2,
              "description": "优先级不够明确或合理"
            },
            {
              "score": 1,
              "description": "优先级不明确或不合理"
            }
          ]
        },
        {
          "name": "一致性",
          "description": "需求之间是否一致，无冲突",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "需求完全一致，无任何冲突"
            },
            {
              "score": 4,
              "description": "需求一致，无明显冲突"
            },
            {
              "score": 3,
              "description": "需求基本一致，有少量冲突"
            },
            {
              "score": 2,
              "description": "需求一致性较差，有较多冲突"
            },
            {
              "score": 1,
              "description": "需求严重不一致，冲突很多"
            }
          ]
        }
      ]
    },
    {
      "name": "用户导向",
      "description": "评估需求是否以用户为中心",
      "weight": 0.2,
      "criteria": [
        {
          "name": "用户价值",
          "description": "需求是否真正解决用户问题",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "用户价值非常高，完美解决用户痛点"
            },
            {
              "score": 4,
              "description": "用户价值高，有效解决用户痛点"
            },
            {
              "score": 3,
              "description": "用户价值一般，基本解决用户问题"
            },
            {
              "score": 2,
              "description": "用户价值较低，解决用户问题效果不佳"
            },
            {
              "score": 1,
              "description": "缺乏用户价值，不能解决用户问题"
            }
          ]
        },
        {
          "name": "用户体验",
          "description": "是否考虑用户体验和使用便利性",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "用户体验考虑非常周到"
            },
            {
              "score": 4,
              "description": "用户体验考虑周到"
            },
            {
              "score": 3,
              "description": "用户体验基本考虑"
            },
            {
              "score": 2,
              "description": "用户体验考虑不足"
            },
            {
              "score": 1,
              "description": "缺乏用户体验考虑"
            }
          ]
        },
        {
          "name": "用户反馈",
          "description": "是否基于用户反馈和调研",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "完全基于充分的用户反馈和调研"
            },
            {
              "score": 4,
              "description": "基于用户反馈和调研"
            },
            {
              "score": 3,
              "description": "基本基于用户反馈和调研"
            },
            {
              "score": 2,
              "description": "用户反馈和调研不足"
            },
            {
              "score": 1,
              "description": "缺乏用户反馈和调研"
            }
          ]
        }
      ]
    },
    {
      "name": "可行性分析",
      "description": "评估需求的可行性",
      "weight": 0.15,
      "criteria": [
        {
          "name": "技术可行性",
          "description": "技术实现是否可行",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "技术可行性非常高，有成熟方案"
            },
            {
              "score": 4,
              "description": "技术可行性高，有成熟方案"
            },
            {
              "score": 3,
              "description": "技术可行性基本可行"
            },
            {
              "score": 2,
              "description": "技术可行性较低"
            },
            {
              "score": 1,
              "description": "技术可行性很低"
            }
          ]
        },
        {
          "name": "资源可行性",
          "description": "资源是否充足",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "资源非常充足，完全满足需求"
            },
            {
              "score": 4,
              "description": "资源充足，满足需求"
            },
            {
              "score": 3,
              "description": "资源基本充足"
            },
            {
              "score": 2,
              "description": "资源不够充足"
            },
            {
              "score": 1,
              "description": "资源严重不足"
            }
          ]
        },
        {
          "name": "时间可行性",
          "description": "时间安排是否合理",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "时间安排非常合理，完全可行"
            },
            {
              "score": 4,
              "description": "时间安排合理，可行"
            },
            {
              "score": 3,
              "description": "时间安排基本合理"
            },
            {
              "score": 2,
              "description": "时间安排不够合理"
            },
            {
              "score": 1,
              "description": "时间安排不合理"
            }
          ]
        }
      ]
    },
    {
      "name": "商业价值",
      "description": "评估需求的商业价值",
      "weight": 0.1,
      "criteria": [
        {
          "name": "市场价值",
          "description": "市场价值和竞争优势",
          "weight": 0.4,
          "levels": [
            {
              "score": 5,
              "description": "市场价值非常高，竞争优势明显"
            },
            {
              "score": 4,
              "description": "市场价值高，竞争优势明显"
            },
            {
              "score": 3,
              "description": "市场价值一般，有一定优势"
            },
            {
              "score": 2,
              "description": "市场价值较低，优势不明显"
            },
            {
              "score": 1,
              "description": "缺乏市场价值和竞争优势"
            }
          ]
        },
        {
          "name": "收益预测",
          "description": "收益预测是否合理",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "收益预测非常合理，有充分依据"
            },
            {
              "score": 4,
              "description": "收益预测合理，有依据"
            },
            {
              "score": 3,
              "description": "收益预测基本合理"
            },
            {
              "score": 2,
              "description": "收益预测不够合理"
            },
            {
              "score": 1,
              "description": "收益预测不合理"
            }
          ]
        },
        {
          "name": "成本效益",
          "description": "成本效益分析是否合理",
          "weight": 0.3,
          "levels": [
            {
              "score": 5,
              "description": "成本效益分析非常合理，回报率高"
            },
            {
              "score": 4,
              "description": "成本效益分析合理，回报率高"
            },
            {
              "score": 3,
              "description": "成本效益分析基本合理"
            },
            {
              "score": 2,
              "description": "成本效益分析不够合理"
            },
            {
              "score": 1,
              "description": "成本效益分析不合理"
            }
          ]
        }
      ]
    }
  ],
  "totalWeight": 1.0,
  "metadata": {
    "author": "AI评分系统",
    "isTemplate": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "tags": ["产品需求", "产品设计", "用户体验"]
  }
}
```

## 使用说明

### 导入评分标准

1. 在VS Code中打开AI智能评分系统
2. 选择"评分标准管理"
3. 选择"导入标准"
4. 复制相应的JSON标准数据
5. 保存并使用

### 自定义评分标准

基于提供的模板，您可以：
- 修改评分维度的权重
- 调整评分等级的描述
- 添加或删除评分标准
- 创建适合特定领域的评分标准

### 测试建议

使用这些评分标准时，建议：
1. 先使用完整的标准进行测试
2. 逐步调整权重和描述
3. 记录评分结果的准确性
4. 根据实际需求优化标准