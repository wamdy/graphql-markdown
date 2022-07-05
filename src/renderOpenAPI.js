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
  const title = options.title
  const printer = options.printer || console.log
  const headingLevel = options.headingLevel || 1
  const getTypeURL = options.getTypeURL

  const isInputObject = type.kind === 'INPUT_OBJECT'

  printer(`"${type.name}":{"type":"object","properties":{`)

  const fields = isInputObject ? type.inputFields : type.fields
  fields.forEach((field, index) => {
    printer(`"${field.name}":{`)
    var argType = field.type
    if (argType.kind === 'NON_NULL') {
      argType = argType.ofType
    }
    if (argType.kind === 'LIST') {
      printer(`"type": "array",`)
      printer(`"items": {`)
      printer(
        `"$ref": "#/components/${title.toLowerCase()}/${argType.ofType.name}"`
      )
      printer(`}`)
    } else if (
      argType.kind === 'INPUT_OBJECT' ||
      argType.kind === 'OBJECT' ||
      argType.kind === 'ENUM' ||
      argType.kind === 'INTERFACE'
    ) {
      printer(`"$ref": "#/components/${title.toLowerCase()}/${argType.name}"`)
    } else if (argType.kind === 'SCALAR') {
      printer(`"type": "${scalarTypeMap[argType.name]}"`)
    }
    printer(`}`)
    if (index < fields.length - 1) {
      printer(`,`)
    }
  })
  printer('},"required":[')
  var detectNextField = false
  fields.forEach((field, index) => {
    var argType = field.type
    if (argType.kind === 'NON_NULL') {
      printer(`"${field.name}"`)
      detectNextField = true
    }
    if (detectNextField && index < fields.length - 1) {
      var nextField = fields[index + 1]
      if (nextField.type.kind === 'NON_NULL') {
        printer(`,`)
      }
    }
  })
  printer(`]`)

  printer('}')
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
  const title = options.title
  const printer = options.printer || console.log
  const headingLevel = options.headingLevel || 1
  const getTypeURL = options.getTypeURL
  const getType = options.getType
  const isInputObject = type.kind === 'INPUT_OBJECT'

  const fields = isInputObject ? type.inputFields : type.fields
  fields.forEach((field, index) => {
    printer(`"/${field.name}":{`)
    printer(`"${type.name === 'Query' ? 'post' : 'get'}":{`)
    printer(`"summary": "${toDescription(field.name)}",`)
    printer(`"deprecated": false,`)
    printer(`"description": "${toDescription(field.name)}",`)
    printer(`"tags": ["${title.toLowerCase()}"],`)
    printer(`"parameters": [],`)
    if (!isInputObject && field.args.length) {
      printer(
        `"requestBody": {"content": {"application/json": {"schema": {"type": "object","properties": {`
      )
      field.args.forEach((arg, i) => {
        printer(`"${arg.name}": {`)
        let argType = arg.type
        if (argType.kind === 'NON_NULL') {
          argType = argType.ofType
        }
        if (argType.kind === 'LIST') {
          printer(`"type": "array",`)
          printer(`"items": {`)
          printer(
            `"$ref": "#/components/${title.toLowerCase()}/${
              argType.ofType.name
            }"`
          )
          printer(`}`)
        } else {
          printer(
            `"$ref": "#/components/${title.toLowerCase()}/${argType.name}"`
          )
        }
        printer(`}`)
        if (i < field.args.length - 1) {
          printer(`,`)
        }
      })
      printer(`},`)
      printer(`"required": [`)

      field.args.forEach((arg, i) => {
        if (arg.type.kind === 'NON_NULL') {
          printer(`"${arg.name}"`)
        }
        if (i < field.args.length - 1) {
          var nextArg = field.args[i + 1]
          if (nextArg.type.kind === 'NON_NULL') {
            printer(`,`)
          }
        }
      })

      printer(`]`)
      printer(`}}}},`)
    }

    printer(`"responses": {"200": {"description": "Success",`)
    printer(
      `"content": {"application/json": {"schema": {"type": "object","properties": {`
    )
    printer(`"code": { "type": "string"},`)
    printer(`"message": { "type": "string"},`)
    printer(`"isSuccess": { "type": "boolean"},`)
    printer(`"result": {`)
    printer(`"$ref": "#/components/${title.toLowerCase()}/${field.type.name}"`)
    printer(`}`)
    printer(`}}}}`)
    printer(`}}}}`)
    if (index < fields.length - 1) {
      printer(`,`)
    }
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

function renderOpenAPI(schema, options) {
  options = options || {}
  const title = options.title || 'Schema'
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
    const url = `#/components/${title.toLowerCase()}/${type.name}`
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

  printer(`{`)
  printer(`    "openapi": "3.0.1",`)
  printer(`    "info": {`)
  if (!skipTitle) {
    printer(`    "title": "${title}",`)
  }
  if (prologue) {
    printer(`        "description": "${prologue}",`)
  } else {
    printer(`        "description": "",`)
  }
  printer(`        "version": "1.0.0"`)
  printer(`},"tags": ["${title.toLowerCase()}"],`)
  printer(`  "paths": {`)
  if (query) {
    renderApi(query, {
      skipTitle: true,
      title,
      headingLevel,
      printer,
      getTypeURL,
      getType
    })
  }
  if (mutation) {
    printer(` ,`)
    renderApi(mutation, {
      skipTitle: true,
      title,
      headingLevel,
      printer,
      getTypeURL,
      getType
    })
  }

  printer(`  },`)
  printer(`  "components": {`)
  printer(`    "${title.toLowerCase()}": {`)
  if (objects.length) {
    // printer(`\n${'#'.repeat(headingLevel + 1)} Objects`)
    objects.forEach((type, index) => {
      renderObject(type, { headingLevel, title, printer, getTypeURL })
      if (index < objects.length - 1) {
        printer(',')
      }
    })
  }

  if (inputs.length) {
    printer(` ,`)
    // printer(`\n${'#'.repeat(headingLevel + 1)} Inputs`)
    inputs.forEach((type, index) => {
      renderObject(type, { headingLevel, title, printer, getTypeURL })
      if (index < inputs.length - 1) {
        printer(',')
      }
    })
  }

  if (enums.length) {
    printer(` ,`)
    // printer(`\n${'#'.repeat(headingLevel + 1)} Enums`)
    enums.forEach((type, index) => {
      printer(`        "${type.name}": {`)
      printer(`            "type": "string",`)
      printer(`            "enum": [`)
      type.enumValues.forEach((value, index) => {
        printer(`"${value.name}"`)
        if (index < type.enumValues.length - 1) {
          printer(',')
        }
      })
      printer(`            ]`)
      printer(`        }`)
      if (index < enums.length - 1) {
        printer(',')
      }
    })
  }

  if (interfaces.length) {
    printer(` ,`)
    // printer(`\n${'#'.repeat(headingLevel + 1)} Interfaces\n`)
    interfaces.forEach((type, index) => {
      renderObject(type, { headingLevel, title, printer, getTypeURL })
      if (index < interfaces.length - 1) {
        printer(',')
      }
    })
  }

  printer(`    }`)
  printer(`  }`)
  printer(`}`)
}

var scalarTypeMap = {
  String: 'string',
  Int: 'integer',
  Int64: 'integer',
  Int32: 'integer',
  Float: 'number',
  Boolean: 'boolean',
  ID: 'string',
  Time: 'string'
}
module.exports = renderOpenAPI
