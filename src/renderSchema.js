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
  return url ? `[${type.name}](${url})` : type.name
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
    printer(
      `| <font color="#FFC0CBH" > \`${field.name}\` ${renderNonNull(
        field.type,
        { getTypeURL }
      )} </font>&nbsp; ${renderType(field.type, {
        getTypeURL
      })} | ${toDescription(field.name)} |`
    )
  })
}

function toDescription(name) {
  let str = name.replace(/([A-Z])/g, ' $1').toLowerCase()
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
      `\n${'#'.repeat(headingLevel + 2)} ${toDescription(
        field.name
      )}\n<a id="${field.name.toLowerCase()}"></a>`
    )
    printer(`> ${type.name === 'Query' ? 'POST' : 'GET'} /${field.name}<br />`)

    if (!isInputObject && field.args.length) {
      printer(`> Path parameters:`)
      printer('>')
      printer('> ```json')
      field.args.forEach((arg, i) => {
        let s = `> "${arg.name}": ${renderParameters(arg.type, 0, { getType })}`
        if (i < field.args.length - 1) {
          s += ','
        }
        printer(s)
      })
      printer('> ```')
    }
    printer('>')
    printer('> curl:')
    printer('>')
    printer('> ```shell')
    printer(
      `> curl --location --request ${type.name === 'Query' ? 'POST' : 'GET'} ${
        field.name
      }\`\\ `
    )
    printer(`> --header 'User-Agent: apifox/1.0.0 (https://www.apifox.cn)' \\ `)
    printer(`> --header 'Content-Type: application/json' \\ `)

    if (!isInputObject && field.args.length) {
      let s1 = `> --data-raw '{`
      field.args.forEach((arg, i) => {
        s1 += `$${arg.name}`
        if (i < field.args.length - 1) {
          s1 += ','
        }
      })
      s1 += `}' \\`
      printer(s1)
    }
    printer('> ```')
    printer(`> ResponseCode: 200{{ok}} <br/>`)
    printer(`> ResponseEntity: ${renderType(field.type, options)}`)
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
  const isScalarObject = type.kind === 'SCALAR' || type.kind === 'ENUM'
  if (isScalarObject) {
    return `"${type.name.toLowerCase()}"`
  }

  const isEnumObject = type.kind === 'ENUM'
  if (isEnumObject) {
    return `${type.name.toLowerCase()}`
  }
  const isInputObject = type.kind === 'INPUT_OBJECT'

  // console.log(type.name)
  let typeDefine = getType(type.name)
  const fields = isInputObject ? typeDefine.inputFields : typeDefine.fields
  if (!fields) {
    return `"${type.name.toLowerCase()}"`
  }
  var result = '{'
  fields.forEach((field, index) => {
    result += '    '
    result += '\n>'
    for (var i = 0; i < level; i++) {
      result += '  '
    }
    result += `"${field.name.toLowerCase()}":${renderParameters(
      field.type,
      level + 1,
      { getType }
    )}`
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
    if (typeMap[type.name]) {
      return url
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
    if (scalars.length) {
      // printer('  * [Scalars](#scalars)')
      printer('<tr style="border:0;background:none">\n')
      scalars.forEach((type, i) => {
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
    if (interfaces.length) {
      // printer('  * [Interfaces](#interfaces)')
      printer('<tr style="border:0;background:none">\n')
      interfaces.forEach((type, i) => {
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
    if (unions.length) {
      // printer('  * [Unions](#unions)')
      printer('<tr style="border:0;background:none">\n')
      unions.forEach((type, i) => {
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

  if (scalars.length) {
    // printer(`\n${'#'.repeat(headingLevel + 1)} Scalars\n`)
    scalars.forEach(type => {
      printer(
        `\n${'#'.repeat(headingLevel + 2)} ${
          type.name
        }\n<a id="${type.name.toLowerCase()}"></a>`
      )
      if (type.description) {
        printer(`${type.description}\n`)
      }
    })
  }

  if (interfaces.length) {
    // printer(`\n${'#'.repeat(headingLevel + 1)} Interfaces\n`)
    interfaces.forEach(type =>
      renderObject(type, { headingLevel, printer, getTypeURL })
    )
  }

  if (unions.length) {
    // printer(`\n${'#'.repeat(headingLevel + 1)} Unions`)
    unions.forEach(type => {
      printer(
        `\n${'#'.repeat(headingLevel + 2)} ${
          type.name
        }\n<a id="${type.name.toLowerCase()}"></a>`
      )
      if (type.description) {
        printer(`${type.description}\n`)
      }
      printer('| Type | Description  |')
      type.possibleTypes.forEach(objType => {
        const obj = objects.find(o => objType.name === o.name)
        const desc = objType.description || (obj && obj.description)
        printer(
          `| <font color="#FFC0CBH" > \`${renderType(objType, {
            getTypeURL
          })}\` </font> | ${toDescription(objType.name)}|`
        )
      })
    })
  }

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
