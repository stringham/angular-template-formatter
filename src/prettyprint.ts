import { HtmlParser, I18NHtmlParser, Parser, Lexer, CompilerConfig, TemplateParser, DomElementSchemaRegistry, Visitor, Node, Attribute, Element, Expansion, Text, Comment, ExpansionCase, ParseSourceSpan } from '@angular/compiler'

function formatElementName(name: string) {
    return name.replace(/^:svg:/, '');
}

export function format(src: string, indentation: number = 4, useSpaces: boolean = true, closeTagSameLine: boolean = false): string {
    const rawHtmlParser = new HtmlParser();
    const htmlParser = new I18NHtmlParser(rawHtmlParser);
    const expressionParser = new Parser(new Lexer());
    const config = new CompilerConfig();
    const parser = new TemplateParser(
        config, expressionParser, new DomElementSchemaRegistry(), htmlParser, null!, []);
    const htmlResult = htmlParser.parse(src, '', true);

    let pretty: string[] = [];
    let indent = 0;
    let attrNewLines = false;

    if(htmlResult.errors && htmlResult.errors.length > 0) {
        return src;
    }

    const selfClosing = {
        'area': true,
        'base': true,
        'br': true,
        'col': true,
        'command': true,
        'embed': true,
        'hr': true,
        'img': true,
        'input': true,
        'keygen': true,
        'link': true,
        'meta': true,
        'param': true,
        'source': true,
        'track': true,
        'wbr': true,
    };

    const skipFormattingChildren = {
        'style': true,
        'pre': true,
    };

    const detectedDoctype = src.match(/^\s*<!DOCTYPE((.|\n|\r)*?)>/i);

    if (detectedDoctype) {
        pretty.push(detectedDoctype[0].trim());
    }

    let getIndent = (i: number): string => {
        if (useSpaces) {
            return new Array(i * indentation).fill(' ').join('');
        } else {
            return new Array(i).fill('\t').join('');
        }
    }

    function getFromSource(parseLocation:ParseSourceSpan) {
        return parseLocation.start.file.content.substring(parseLocation.start.offset, parseLocation.end.offset);
    }

    let visitor: Visitor = {
        visitElement: function (element, context: any) {
            if (context.skipFormattingChildren) {
                pretty.push(getFromSource(element.sourceSpan));
                return;
            }
            if (pretty.length > 0) {
                pretty.push('\n');
            }
            pretty.push(getIndent(indent) + '<' + formatElementName(element.name));
            attrNewLines = element.attrs.length > 1 && element.name != 'link';
            element.attrs.forEach(attr => {
                attr.visit(visitor, {});
            });
            if (!closeTagSameLine && attrNewLines) {
                pretty.push('\n' + getIndent(indent));
            }
            pretty.push('>');
            indent++;
            let ctx = {
                inlineTextNode: false,
                textNodeInlined: false,
                skipFormattingChildren: skipFormattingChildren.hasOwnProperty(element.name),
            };
            if (!attrNewLines && element.children.length == 1) {
                ctx.inlineTextNode = true;
            }
            element.children.forEach(element => {
                element.visit(visitor, ctx);
            });
            indent--;
            if (element.children.length > 0 && !ctx.textNodeInlined && !ctx.skipFormattingChildren) {
                pretty.push('\n' + getIndent(indent));
            }
            if (!selfClosing.hasOwnProperty(element.name)) {
                pretty.push(`</${formatElementName(element.name)}>`);
            }
        },
        visit: function (node: Node, context: any) {
            console.error('IF YOU SEE THIS THE PRETTY PRINTER NEEDS TO BE UPDATED')
        },
        visitAttribute: function (attribute: Attribute, context: any) {
            let prefix = attrNewLines ? '\n' + getIndent(indent + 1) : ' ';
            pretty.push(prefix + attribute.name);
            if (attribute.value.length) {
                const value = getFromSource(attribute.valueSpan);
                pretty.push(`=${value.trim()}`);
            }
        },
        visitComment: function (comment: Comment, context: any) {
            pretty.push('\n' + getIndent(indent) + '<!-- ' + comment.value.trim() + ' -->');
        },
        visitExpansion: function (expansion: Expansion, context: any) {
            console.error('IF YOU SEE THIS THE PRETTY PRINTER NEEDS TO BE UPDATED')
        },
        visitExpansionCase: function (expansionCase: ExpansionCase, context: any) {
            console.error('IF YOU SEE THIS THE PRETTY PRINTER NEEDS TO BE UPDATED')
        },
        visitText: function (text: Text, context: any) {
            const value = getFromSource(text.sourceSpan);
            if (context.skipFormattingChildren) {
                pretty.push(value);
                return;
            }
            let shouldInline = context.inlineTextNode && value.trim().length < 40 &&
                value.trim().length + pretty[pretty.length - 1].length < 140;

            context.textNodeInlined = shouldInline;
            if (value.trim().length > 0) {
                let prefix = shouldInline ? '' : '\n' + getIndent(indent);
                pretty.push(prefix + value.trim());
            } else if (!shouldInline) {
                pretty.push(value.replace('\n', '').replace(/ /g, '').replace(/\t/g, '').replace(/\n+/, '\n'));
            }
        }
    }

    htmlResult.rootNodes.forEach(node => {
        node.visit(visitor, {});
    })

    return pretty.join('').trim() + '\n';
}
