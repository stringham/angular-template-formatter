import { Attribute, Comment, Expansion, ExpansionCase, HtmlParser, I18NHtmlParser, Node, ParseSourceSpan, Text, Visitor, Element } from '@angular/compiler';

/* 
* if the elements has svg: prepended for example <svg:g
* then leave it (dont remove 'svg:')
* further info: https://teropa.info/blog/2016/12/12/graphics-in-angular-2.html
*/
function formatElementName(element: Element) {
    const file = element.sourceSpan.start.file.content;
    const line = element.sourceSpan.start.line;

    const lineString = file.split('\n')[line];
    let name = element.name
    
    if (lineString.includes('svg:')) {
        return name.replace(/^:svg:/, 'svg:');
    } 
    
    return name.replace(/^:svg:/, '');
}

function formatElementAttribute(attributeName: string) {
    /* 
    * avoid turning this:
    * xml:space="preserve"
    * into
    * :xml:space="preserve" -> the parser prepends ':'
    */
    return attributeName.replace(/^:/, "")
}

export function format(src: string, indentation: number = 4, useSpaces: boolean = true, closeTagSameLine: boolean = false): string {
    const rawHtmlParser = new HtmlParser();
    const htmlParser = new I18NHtmlParser(rawHtmlParser);
    const htmlResult = htmlParser.parse(src, '', true);

    let pretty: string[] = [];
    let indent = 0;
    let attrNewLines = false;

    if (htmlResult.errors && htmlResult.errors.length > 0) {
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

    function getFromSource(parseLocation: ParseSourceSpan) {
        return parseLocation.start.file.content.substring(parseLocation.start.offset, parseLocation.end.offset);
    }

    let visitor: Visitor = {
        visitElement: function (element) {
            if (pretty.length > 0) {
                pretty.push('\n');
            }
            pretty.push(getIndent(indent) + '<' + formatElementName(element));
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
                pretty.push(`</${formatElementName(element)}>`);
            }
        },
        visit: function (node: Node, context: any) {
            console.error('IF YOU SEE THIS THE PRETTY PRINTER NEEDS TO BE UPDATED')
        },
        visitAttribute: function (attribute: Attribute, context: any) {
            let prefix = attrNewLines ? '\n' + getIndent(indent + 1) : ' ';
            pretty.push(prefix + formatElementAttribute(attribute.name));
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
