/* jshint esversion: 6 */
'use strict'
function sortBy(arr, property) {
  arr.sort((a, b) => {
    const aValue = a[property]
    const bValue = b[property]
    if (aValue > bValue) {
      return 1
    }
    if (bValue > aValue) {
      return -1
    }
    return 0
  })
}

function renderNonNull(type, options) {
  if (type.kind === 'NON_NULL') {
    return '*'
  }
  return ' '
}

function renderType(type, options) {
  if (type.kind === 'NON_NULL') {
    return renderType(type.ofType, options)
  }
  if (type.kind === 'LIST') {
    return `[${renderType(type.ofType, options)}]`
  }
  const url = options.getTypeURL(type)

  let typeName = type.name
  if (type.kind === 'SCALAR') {
    typeName = scalarTypeMap[type.name]
  }
  return url ? `[${typeName}](${url})` : typeName
}

var scalarTypeMap = {
  String: 'string',
  Int: 'int',
  Int64: 'int',
  Int32: 'int',
  Float: 'number',
  Boolean: 'bool',
  ID: 'string',
  Time: 'time.Time'
}

var scalarDefaultValueMap = {
  String: '"string"',
  Int: '0',
  Int64: '0',
  Int32: '0',
  Float: '0.0',
  Boolean: 'true',
  ID: '"string"',
  Time: '"2022-01-01T00:00:00Z"'
}

function renderObject(type, options) {
  options = options || {}
  const skipTitle = options.skipTitle === true
  const printer = options.printer || console.log
  const headingLevel = options.headingLevel || 1
  const getTypeURL = options.getTypeURL
  const isInputObject = type.kind === 'INPUT_OBJECT'

  if (!skipTitle) {
    printer(
      `\n${'#'.repeat(headingLevel + 2)} ${
        type.name
      }\n<a id="${type.name.toLowerCase()}"></a>`
    )
  }
  if (type.description) {
    printer(`${type.description}\n`)
  }
  printer('\n| Field  | Description   |')
  printer('| ------ | ------------ |')
  const fields = isInputObject ? type.inputFields : type.fields
  fields.forEach(field => {
    let fieldDescription = field.description
    if (!fieldDescription) {
      fieldDescription = toDescription(field.name)
    }
    printer(
      `| <font color="#FFC0CBH" > \`${field.name}\` ${renderNonNull(
        field.type,
        {
          getTypeURL
        }
      )} </font>&nbsp; ${renderType(field.type, {
        getTypeURL
      })} | ${fieldDescription} |`
    )
  })
}

function toAPIName(name) {
  let str = name.replace(/(([A-Z])+)/g, ' $1')
  return str.replace(str[0], str[0].toUpperCase())
}

function toDescription(name) {
  let str = name.replace(/(([A-Z])+)/g, ' $1').toLowerCase()
  return str.replace(str[0], str[0].toUpperCase())
}

function toEnumDescription(name) {
  let str = name.replace(/(_)/g, ' ').toLowerCase()
  return str.replace(str[0], str[0].toUpperCase())
}

function renderApi(type, options) {
  options = options || {}
  const skipTitle = options.skipTitle === true
  const printer = options.printer || console.log
  const headingLevel = options.headingLevel || 1
  const getTypeURL = options.getTypeURL
  const getType = options.getType
  const isInputObject = type.kind === 'INPUT_OBJECT'

  const fields = isInputObject ? type.inputFields : type.fields
  fields.forEach(field => {
    printer(
      `\n${'#'.repeat(headingLevel + 2)} ${toAPIName(
        field.name
      )}\n<a id="${field.name.toLowerCase()}"></a>`
    )

    let fieldDescription = field.description
    if (fieldDescription) {
      printer(`${fieldDescription}`)
    }
    printer(`> ${type.name === 'Query' ? 'GET' : 'POST'} /${field.name}<br />`)

    if (!isInputObject && field.args.length) {
      printer(`> Request Body:`)
      printer('>')
      printer('> | Field  | Description   |')
      printer('> | ------ | ------------ |')
      field.args.forEach((arg, i) => {
        let fieldDescription = arg.description
        if (!fieldDescription) {
          fieldDescription = toDescription(arg.name)
        }
        printer(
          `| <font color="#FFC0CBH" > \`${arg.name}\` ${renderNonNull(
            arg.type,
            {
              getTypeURL
            }
          )} </font>&nbsp; ${renderType(arg.type, {
            getTypeURL
          })} | ${fieldDescription} |`
        )
      })
    }
    printer('>')
    printer('> Response Body:')
    printer('>')
    printer('> | Field  | Description   |')
    printer('> | ------ | ------------ |')
    printer(
      '> | <font color="#FFC0CBH" > `code`   </font>&nbsp; string               | Response code |'
    )
    printer(
      '> | <font color="#FFC0CBH" > `message` </font>&nbsp; string               | Response message |'
    )
    printer(
      '> | <font color="#FFC0CBH" > `isSuccess`   </font>&nbsp; bool           | Is Success |'
    )
    printer(
      `> | <font color="#FFC0CBH" > \`result\` </font>&nbsp; ${renderType(
        field.type,
        options
      )} | Result |`
    )
    printer('>')
    printer('> Request Example:')
    printer('>')
    printer('> ```shell')
    printer(
      `> curl -X ${type.name === 'Query' ? 'GET' : 'POST'} /${field.name} \\ `
    )
    printer(`> --header "Content-Type: application/json" \\ `)
    printer(`> --header "Authorization:Bearer ..." \\`)
    if (!isInputObject && field.args.length) {
      printer(`> --data-binary @- << DATA`)
      printer('> {')
      field.args.forEach((arg, i) => {
        let s = `> "${arg.name}": ${renderParameters(arg.type, 0, { getType })}`
        if (i < field.args.length - 1) {
          s += ','
        }
        printer(s)
      })
      printer(`> }`)
      printer('> DATA')
    }
    printer('> ```')
    printer('> Response Example:<br/>')
    printer(`> HTTP Code: 200{{ok}} <br/>`)
    printer('>')
    printer('> ```json')
    printer(`> {`)
    printer(`> "code": "success",`)
    printer(`> "message": "ok",`)
    printer(`> "isSuccess": true,`)
    printer(`> "result": ${renderParameters(field.type, 1, { getType })}`)
    printer(`> }`)
    printer('> ```')
  })
}

// 递归迭代类型结构
function renderParameters(type, level, options) {
  const getType = options.getType
  if (type.kind === 'NON_NULL') {
    return renderParameters(type.ofType, level + 1, options)
  }
  if (type.kind === 'LIST') {
    return `[${renderParameters(type.ofType, level + 1, options)}]`
  }
  const isScalarObject = type.kind === 'SCALAR'
  if (isScalarObject) {
    return `${scalarDefaultValueMap[type.name]}`
    // return `"${type.name.toLowerCase()}"`
  }

  const isEnumObject = type.kind === 'ENUM'
  let typeDefine = getType(type.name)
  if (isEnumObject) {
    return `"${typeDefine.enumValues[0].name}"`
  }
  const isInputObject = type.kind === 'INPUT_OBJECT'

  // console.log(type.name)
  const fields = isInputObject ? typeDefine.inputFields : typeDefine.fields
  if (!fields) {
    return `"${type.name}"`
  }
  var result = '{'
  fields.forEach((field, index) => {
    result += '    '
    result += '\n>'
    for (var i = 0; i < level; i++) {
      result += '  '
    }
    result += `"${field.name}":${renderParameters(field.type, level + 1, {
      getType
    })}`
    if (index < fields.length - 1) {
      result += ','
    }
  })
  result += '\n>'
  for (var i = 0; i < level; i++) {
    result += '  '
  }
  result += '}'
  return result
}

function renderSchema(schema, options) {
  options = options || {}
  const title = options.title || 'Schema Types'
  const skipTitle = options.skipTitle || false
  const skipTableOfContents = options.skipTableOfContents || false
  const prologue = options.prologue || ''
  const epilogue = options.epilogue || ''
  const printer = options.printer || console.log
  const headingLevel = options.headingLevel || 1
  const unknownTypeURL = options.unknownTypeURL

  if (schema.__schema) {
    schema = schema.__schema
  }

  const types = schema.types.filter(type => !type.name.startsWith('__'))
  const typeMap = schema.types.reduce((typeMap, type) => {
    return Object.assign(typeMap, { [type.name]: type })
  }, {})
  const getTypeURL = type => {
    const url = `#${type.name.toLowerCase()}`
    let typeMapElement = typeMap[type.name]
    if (typeMapElement) {
      if (
        typeMapElement.kind === 'ENUM' ||
        typeMapElement.kind === 'INPUT_OBJECT' ||
        typeMapElement.kind === 'UNION' ||
        typeMapElement.kind === 'INTERFACE' ||
        typeMapElement.kind === 'OBJECT'
      ) {
        return url
      }
      return unknownTypeURL
    } else if (typeof unknownTypeURL === 'function') {
      return unknownTypeURL(type)
    } else if (unknownTypeURL) {
      return unknownTypeURL + url
    }
  }
  const getType = typeName => {
    if (typeMap[typeName]) {
      return typeMap[typeName]
    }
    return 'unkown type'
  }
  const queryType = schema.queryType
  const query =
    queryType && types.find(type => type.name === schema.queryType.name)
  const mutationType = schema.mutationType
  const mutation =
    mutationType && types.find(type => type.name === schema.mutationType.name)
  const objects = types.filter(
    type => type.kind === 'OBJECT' && type !== query && type !== mutation
  )
  const inputs = types.filter(type => type.kind === 'INPUT_OBJECT')
  const enums = types.filter(type => type.kind === 'ENUM')
  const scalars = types.filter(type => type.kind === 'SCALAR')
  const interfaces = types.filter(type => type.kind === 'INTERFACE')
  const unions = types.filter(type => type.kind === 'UNION')

  sortBy(objects, 'name')
  sortBy(inputs, 'name')
  sortBy(enums, 'name')
  sortBy(scalars, 'name')
  sortBy(interfaces, 'name')
  sortBy(unions, 'name')

  if (!skipTitle) {
    printer(`${'#'.repeat(headingLevel)} ${title}\n`)
  }

  if (prologue) {
    printer(`${prologue}\n`)
  }

  if (!skipTableOfContents) {
    // printer('<details>')
    printer('## Representations\n')
    // if (query) {
    //   printer('  * [Query](#query)')
    // }
    // if (mutation) {
    //   printer('  * [Mutation](#mutation)')
    // }
    printer('<table>\n')
    if (objects.length) {
      // printer('  * [Objects](#objects)')
      printer('<tr style="border:0;background:none">\n')
      objects.forEach((type, i) => {
        printer(
          `<td style="border:0"><a href="#${type.name.toLowerCase()}">${
            type.name
          }</a></td>`
        )
        if ((i + 1) % 5 === 0) {
          printer('</tr>\n<tr style="border:0;background:none">\n')
        }
      })
      printer('</tr>\n')
    }

    if (inputs.length) {
      // printer('  * [Inputs](#inputs)')
      printer('<tr style="border:0;background:none">\n')
      inputs.forEach((type, i) => {
        printer(
          `<td style="border:0"><a href="#${type.name.toLowerCase()}">${
            type.name
          }</a></td>`
        )
        if ((i + 1) % 5 === 0) {
          printer('</tr>\n<tr style="border:0;background:none">\n')
        }
      })
      printer('</tr>\n')
    }

    if (enums.length) {
      // printer('  * [Enums](#enums)')
      printer('<tr style="border:0;background:none">\n')
      enums.forEach((type, i) => {
        printer(
          `<td style="border:0"><a href="#${type.name.toLowerCase()}">${
            type.name
          }</a></td>`
        )
        if ((i + 1) % 5 === 0) {
          printer('</tr>\n<tr style="border:0;background:none">\n')
        }
      })
      printer('</tr>\n')
    }
    // if (scalars.length) {
    //   // printer('  * [Scalars](#scalars)')
    //   printer('<tr style="border:0;background:none">\n')
    //   scalars.forEach((type, i) => {
    //     printer(
    //       `<td style="border:0"><a href="#${type.name.toLowerCase()}">${
    //         type.name
    //       }</a></td>`
    //     )
    //     if ((i + 1) % 5 === 0) {
    //       printer('</tr>\n<tr style="border:0;background:none">\n')
    //     }
    //   })
    //   printer('</tr>\n')
    // }

    // if (interfaces.length) {
    //   // printer('  * [Interfaces](#interfaces)')
    //   printer('<tr style="border:0;background:none">\n')
    //   interfaces.forEach((type, i) => {
    //     printer(
    //       `<td style="border:0"><a href="#${type.name.toLowerCase()}">${
    //         type.name
    //       }</a></td>`
    //     )
    //     if ((i + 1) % 5 === 0) {
    //       printer('</tr>\n<tr style="border:0;background:none">\n')
    //     }
    //   })
    //   printer('</tr>\n')
    // }

    // if (unions.length) {
    //   // printer('  * [Unions](#unions)')
    //   printer('<tr style="border:0;background:none">\n')
    //   unions.forEach((type, i) => {
    //     printer(
    //       `<td style="border:0"><a href="#${type.name.toLowerCase()}">${
    //         type.name
    //       }</a></td>`
    //     )
    //     if ((i + 1) % 5 === 0) {
    //       printer('</tr>\n<tr style="border:0;background:none">\n')
    //     }
    //   })
    //   printer('</tr>\n')
    // }
    // printer('\n</details>')
    printer('</table>\n')
  }

  if (objects.length) {
    // printer(`\n${'#'.repeat(headingLevel + 1)} Objects`)
    objects.forEach(type =>
      renderObject(type, { headingLevel, printer, getTypeURL })
    )
  }

  if (inputs.length) {
    // printer(`\n${'#'.repeat(headingLevel + 1)} Inputs`)
    inputs.forEach(type =>
      renderObject(type, { headingLevel, printer, getTypeURL })
    )
  }

  if (enums.length) {
    // printer(`\n${'#'.repeat(headingLevel + 1)} Enums`)
    enums.forEach(type => {
      printer(
        `\n${'#'.repeat(headingLevel + 2)} ${
          type.name
        }\n<a id="${type.name.toLowerCase()}"></a>`
      )

      if (type.description) {
        printer(`${type.description}\n`)
      }
      printer('\n| Value | Description  |')
      printer('| ---------- | ------ |')
      type.enumValues.forEach(value => {
        printer(
          `| <font color="#FFC0CBH" > \`${
            value.name
          }\` </font> | ${toEnumDescription(value.name)} |`
        )
        // printer(`| ${value.name} |  |`)
      })
      printer('\n')
    })
  }

  // if (scalars.length) {
  //   // printer(`\n${'#'.repeat(headingLevel + 1)} Scalars\n`)
  //   scalars.forEach(type => {
  //     printer(
  //       `\n${'#'.repeat(headingLevel + 2)} ${
  //         type.name
  //       }\n<a id="${type.name.toLowerCase()}"></a>`
  //     )
  //     if (type.description) {
  //       printer(`${type.description}\n`)
  //     }
  //   })
  // }

  // if (interfaces.length) {
  //   // printer(`\n${'#'.repeat(headingLevel + 1)} Interfaces\n`)
  //   interfaces.forEach(type =>
  //     renderObject(type, { headingLevel, printer, getTypeURL })
  //   )
  // }

  // if (unions.length) {
  //   // printer(`\n${'#'.repeat(headingLevel + 1)} Unions`)
  //   unions.forEach(type => {
  //     printer(
  //       `\n${'#'.repeat(headingLevel + 2)} ${
  //         type.name
  //       }\n<a id="${type.name.toLowerCase()}"></a>`
  //     )
  //     if (type.description) {
  //       printer(`${type.description}\n`)
  //     }
  //     printer('| Type | Description  |')
  //     type.possibleTypes.forEach(objType => {
  //       const obj = objects.find(o => objType.name === o.name)
  //       const desc = objType.description || (obj && obj.description)
  //       printer(
  //         `| <font color="#FFC0CBH" > \`${renderType(objType, {
  //           getTypeURL
  //         })}\` </font> | ${toDescription(objType.name)}|`
  //       )
  //     })
  //   })
  // }

  printer('\n## API Category')
  if (query) {
    printer(
      `\n${'#'.repeat(headingLevel + 1)} ${
        query.name === 'Query' ? '' : ' (' + query.name + ')'
      }`
    )
    renderApi(query, {
      skipTitle: true,
      headingLevel,
      printer,
      getTypeURL,
      getType
    })
  }

  if (mutation) {
    printer(
      `\n${'#'.repeat(headingLevel + 1)} ${
        mutation.name === 'Mutation' ? '' : ' (' + mutation.name + ')'
      }`
    )
    renderApi(mutation, {
      skipTitle: true,
      headingLevel,
      printer,
      getTypeURL,
      getType
    })
  }

  if (epilogue) {
    printer(`\n${epilogue}`)
  }
}

module.exports = renderSchema
