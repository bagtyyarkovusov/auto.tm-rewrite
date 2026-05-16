#!/usr/bin/env node
// Patches @react-native/codegen to handle TSQualifiedName (e.g., CT.DirectEventHandler).
// The codegen TypeScript parser directly accesses typeName.name in many places,
// which returns undefined for TSQualifiedName nodes (which have left/right instead of name).
//
// Instead of patching every call site, we intercept getAst() to recursively
// normalize all TSTypeReference nodes: TSQualifiedName → Identifier.
// This handles every codegen path in one shot: prop parsing, command generation,
// event handling, extends resolution, component name extraction, etc.

const fs = require("node:fs");
const path = require("node:path");

const pnpmDir = path.resolve(__dirname, "..", "node_modules", ".pnpm");

// AST normalizer: walk all nodes and replace TSQualifiedName with right Identifier
const NORMALIZE_FN = `function _normalizeTSTypeReferences(ast) {
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    // Replace CT.* qualified names → simple Identifier
    // (CT is react-native's CodegenTypes namespace — codegen handles these as simple names)
    // Don't touch other qualified names like React.ElementRef.
    if (
      node.type === 'TSTypeReference' &&
      node.typeName &&
      node.typeName.type === 'TSQualifiedName' &&
      node.typeName.left &&
      node.typeName.left.name === 'CT'
    ) {
      node.typeName = node.typeName.right;
    }
    for (const key of Object.keys(node)) {
      if (key === 'typeName' && node.type === 'TSTypeReference') continue; // already handled
      walk(node[key]);
    }
  }
  walk(ast);
  return ast;
}`;

function patchFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return false;
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  for (const [oldStr, newStr] of replacements) {
    if (content.includes(oldStr) && !content.includes(newStr)) {
      content = content.replaceAll(oldStr, newStr);
      changed = true;
    }
  }

  if (changed) fs.writeFileSync(filePath, content, "utf8");
  return changed;
}

try {
  const entries = fs.readdirSync(pnpmDir);

  for (const entry of entries) {
    if (!entry.startsWith("@react-native+codegen@")) continue;

    const base = path.join(pnpmDir, entry, "node_modules", "@react-native", "codegen", "lib", "parsers", "typescript");
    const parserPath = path.join(base, "parser.js");

    if (fs.existsSync(parserPath)) {
      let content = fs.readFileSync(parserPath, "utf8");

      // Skip if already fully patched
      if (content.includes("_normalizeTSTypeReferences")) {
        console.log("[patch-codegen] already patched:", entry);
        continue;
      }

      // ------ Step 1: Add normalize function and override getAst ------

      // Add the normalizer function before the class definition
      content = content.replace(
        "class TypeScriptParser {",
        `${NORMALIZE_FN}\n\nclass TypeScriptParser {`
      );

      // Override getAst to normalize before returning
      content = content.replace(
        /getAst\(contents, filename\) \{[\s\S]*?return babelParser\.parse[\s\S]*?\n  \}/,
        `getAst(contents, filename) {
    const ast = babelParser.parse(contents, {
      sourceType: 'module',
      plugins: ['typescript'],
    }).program;
    return _normalizeTSTypeReferences(ast);
  }`
      );

      // ------ Step 2: Patch remaining direct typeName.name accesses ------

      // extractTypeFromTypeAnnotation (line ~598) — also use typeName directly
      content = content.replace(
        `extractTypeFromTypeAnnotation(typeAnnotation) {
    return typeAnnotation.type === 'TSTypeReference'
      ? typeAnnotation.typeName.name
      : typeAnnotation.type;
  }`,
        `extractTypeFromTypeAnnotation(typeAnnotation) {
    var _typeName;
    return typeAnnotation.type === 'TSTypeReference' && typeAnnotation.typeName
      ? ((_typeName = typeAnnotation.typeName).type === 'TSQualifiedName' ? _typeName.right.name : _typeName.name)
      : typeAnnotation.type;
  }`
      );

      // getNativeComponentType (line ~404)
      content = content.replace(
        /getNativeComponentType\(typeArgumentParams, funcArgumentParams\) \{[\s\S]*?propsTypeName: typeArgumentParams\[0\]\.typeName\.name,[\s\S]*?\n  \}/,
        `getNativeComponentType(typeArgumentParams, funcArgumentParams) {
    var _tn = typeArgumentParams[0].typeName;
    return {
      propsTypeName: _tn.type === 'TSQualifiedName' ? _tn.right.name : _tn.name,
      componentName: funcArgumentParams[0].value,
    };
  }`
      );

      // extractAnnotatedElement (line ~330)
      content = content.replace(
        /extractAnnotatedElement\(typeAnnotation, types\) \{[\s\S]*?return types\[typeAnnotation\.typeParameters\.params\[0\]\.typeName\.name\];[\s\S]*?\n  \}/,
        `extractAnnotatedElement(typeAnnotation, types) {
    var _tn = typeAnnotation.typeParameters.params[0].typeName;
    return types[_tn.type === 'TSQualifiedName' ? _tn.right.name : _tn.name];
  }`
      );

      // checkIfInvalidModule (line ~112—118)
      content = content.replace(
        /checkIfInvalidModule\(typeArguments\) \{[\s\S]*?typeArguments\.params\[0\]\.typeName\.name !== 'Spec'[\s\S]*?\n  \}/,
        `checkIfInvalidModule(typeArguments) {
    var _tn = typeArguments.params[0].typeName;
    return (
      typeArguments.type !== 'TSTypeParameterInstantiation' ||
      typeArguments.params.length !== 1 ||
      typeArguments.params[0].type !== 'TSTypeReference' ||
      (_tn.type === 'TSQualifiedName' ? _tn.right.name : _tn.name) !== 'Spec'
    );
  }`
      );

      fs.writeFileSync(parserPath, content, "utf8");
      console.log("[patch-codegen] patched parser.js in", entry);
    }

    // ------ parseTopLevelType.js ------
    const ptlPath = path.join(base, "parseTopLevelType.js");
    if (fs.existsSync(ptlPath)) {
      let content = fs.readFileSync(ptlPath, "utf8");

      if (!content.includes("TSQualifiedName")) {
        // Fix getValueFromTypes: types[value.typeName.name]
        content = content.replace(
          /if \(types\[value\.typeName\.name\]\) \{/g,
          `var _tn = value.typeName.type === 'TSQualifiedName' ? value.typeName.right : value.typeName;\n      if (types[_tn.name]) {`
        );

        // Fix handleUnionAndParen: type.typeName.name === 'Readonly' / 'WithDefault'
        const fixReadonly = `(type.typeName.type === 'TSQualifiedName' ? type.typeName.right.name : type.typeName.name)`;
        content = content.replace(
          /type\.typeName\.name === 'Readonly'/g,
          `${fixReadonly} === 'Readonly'`
        );
        content = content.replace(
          /type\.typeName\.name === 'WithDefault'/g,
          `${fixReadonly} === 'WithDefault'`
        );
      }

      fs.writeFileSync(ptlPath, content, "utf8");
      console.log("[patch-codegen] patched parseTopLevelType.js in", entry);
    }

    // ------ components/componentsUtils.js ------
    const cuPath = path.join(base, "components", "componentsUtils.js");
    if (fs.existsSync(cuPath)) {
      let content = fs.readFileSync(cuPath, "utf8");

      if (!content.includes("TSQualifiedName")) {
        // typeArguments.params[0].typeName.name !== 'Spec'
        content = content.replace(
          /typeArguments\.params\[0\]\.typeName\.name !== 'Spec'/g,
          `(typeArguments.params[0].typeName.type === 'TSQualifiedName' ? typeArguments.params[0].typeName.right.name : typeArguments.params[0].typeName.name) !== 'Spec'`
        );

        // typeName.name === 'Readonly'
        content = content.replace(
          /typeName\.name === 'Readonly'/g,
          `(typeName.type === 'TSQualifiedName' ? typeName.right.name : typeName.name) === 'Readonly'`
        );

        // extractedTypeAnnotation.elementType.typeName.name
        content = content.replace(
          /extractedTypeAnnotation\.elementType\.typeName\.name/g,
          `(function(_tn){ return _tn.type === 'TSQualifiedName' ? _tn.right.name : _tn.name; })(extractedTypeAnnotation.elementType.typeName)`
        );

        // property.typeName.name (for getProperties call)
        content = content.replace(
          /parser\.getProperties\(property\.typeName\.name, types\)/g,
          `parser.getProperties(property.typeName.type === 'TSQualifiedName' ? property.typeName.right.name : property.typeName.name, types)`
        );
      }

      fs.writeFileSync(cuPath, content, "utf8");
      console.log("[patch-codegen] patched componentsUtils.js in", entry);
    }

    // ------ components/extends.js ------
    const extPath = path.join(base, "components", "extends.js");
    if (fs.existsSync(extPath)) {
      let content = fs.readFileSync(extPath, "utf8");
      if (!content.includes("TSQualifiedName")) {
        content = content.replace(
          /eventNames\.has\(typeAnnotation\.typeName\.name\)/g,
          `eventNames.has(typeAnnotation.typeName.type === 'TSQualifiedName' ? typeAnnotation.typeName.right.name : typeAnnotation.typeName.name)`
        );
        fs.writeFileSync(extPath, content, "utf8");
        console.log("[patch-codegen] patched extends.js in", entry);
      }
    }

    // ------ components/commands.js ------
    const cmdPath = path.join(base, "components", "commands.js");
    if (fs.existsSync(cmdPath)) {
      let content = fs.readFileSync(cmdPath, "utf8");
      if (!content.includes("TSQualifiedName")) {
        content = content.replace(
          /paramValue\.typeName\.name/g,
          `(function(_tn){ return _tn.type === 'TSQualifiedName' ? _tn.right.name : _tn.name; })(paramValue.typeName)`
        );
        content = content.replace(
          /_inputType\$typeName\.name(?!\s*\|\|)/g,
          `(function(_tn){ return _tn.type === 'TSQualifiedName' ? _tn.right.name : _tn.name; })(_inputType$typeName)`
        );
        fs.writeFileSync(cmdPath, content, "utf8");
        console.log("[patch-codegen] patched commands.js in", entry);
      }
    }
  }
} catch (err) {
  if (err.code !== "ENOENT") {
    console.error("[patch-codegen] failed:", err.message);
  }
}
