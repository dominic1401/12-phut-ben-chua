function decodeFlightMarkup(raw: string) {
  return raw
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u0027/gi, "'")
    .replace(/\\u003d/gi, "=")
    .replace(/\\\"/g, '"');
}

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&([a-z]+);/gi, (entity, name: string) => named[name] ?? entity);
}

function htmlToText(html: string) {
  return decodeEntities(
    html
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<sub[^>]*>[\s\S]*?<\/sub>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/(?:p|div|h[1-6]|li|blockquote)>/gi, "\n\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim().normalize("NFC");
}

function parseLiturgicalDay(raw: string, decoded: string) {
  const renderedMatch = raw.match(
    /<div\b[^>]*class=(["'])[^"']*\bday-name\b[^"']*\1[^>]*>([\s\S]*?)<\/div>/i,
  );
  if (renderedMatch) {
    const renderedDay = htmlToText(renderedMatch[2]).replace(/\s+/g, " ").trim();
    if (renderedDay) return renderedDay;
  }

  const flightMatch = decoded.match(
    /"className":"day-name[^"]*","children":\[([^\]]+)\]/,
  );
  if (!flightMatch) return "Phụng vụ Lời Chúa hôm nay";

  return Array.from(flightMatch[1].matchAll(/"([^"]*)"|(\d+)/g))
    .map((part) => part[1] ?? part[2] ?? "")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRenderedGospel(raw: string) {
  const heading = raw.match(
    /<p\b[^>]*class=(["'])[^"']*\bfont-semibold\b[^"']*\1[^>]*>\s*Tin Mừng[\s\S]*?<span\b[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/p>/i,
  );
  if (!heading || heading.index === undefined) return null;

  const contentAfterHeading = raw.slice(heading.index + heading[0].length);
  const gospelHtml = contentAfterHeading.match(
    /^\s*<hr\b[^>]*\/?\s*>\s*<div\b[^>]*>\s*((?:<p\b[^>]*>[\s\S]*?<\/p>\s*)+)<\/div>/i,
  )?.[1];

  if (!gospelHtml) return null;
  const reference = htmlToText(heading[2]);
  const text = htmlToText(gospelHtml);
  if (!reference || text.length < 40) return null;

  return { reference, text };
}

function parseFlightGospel(decoded: string) {
  const gospelStart = decoded.indexOf('"children":["Tin Mừng"');
  if (gospelStart < 0) return null;

  const gospelBlock = decoded.slice(gospelStart, gospelStart + 2600);
  const reference = gospelBlock.match(
    /"children":\["Tin Mừng"," – ",\["\$","span",null,\{[^}]*"children":"([^"]+)"/,
  )?.[1];

  const token = gospelBlock.match(/"__html":"\$(\w+)"/)?.[1];
  let gospelHtml: string | undefined;

  if (token) {
    const chunk = decoded.match(
      new RegExp(`${token}:T[0-9a-f]+,(<p>[\\s\\S]*?<\\/p>)`, "i"),
    );
    gospelHtml = chunk?.[1];
  }

  if (!gospelHtml) {
    gospelHtml = gospelBlock.match(/"__html":"(<p>[\s\S]*?<\/p>)"/)?.[1];
  }

  if (!reference || !gospelHtml) return null;
  const text = htmlToText(gospelHtml);
  if (text.length < 40) return null;

  return { reference, text };
}

function parseGospel(raw: string, decoded: string) {
  return parseRenderedGospel(raw) ?? parseFlightGospel(decoded);
}

function parseRenderedMeditation(raw: string) {
  // Only inspect rendered markup, not a second copy inside a Flight script.
  const markup = raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  const heading = /<p\b[^>]*class=(["'])[^"']*\bfont-semibold\b[^"']*\1[^>]*>\s*Suy\s+Niệm\s*:?\s*<\/p>/i.exec(markup);
  if (!heading) return undefined;
  const afterHeading = markup.slice(heading.index + heading[0].length);
  const opening = /^\s*<hr\b[^>]*\/?\s*>\s*<div\b[^>]*>/i.exec(afterHeading);
  if (!opening) return undefined;

  // Stop at this block's closing div, even if the article contains nested divs.
  const content = afterHeading.slice(opening[0].length);
  let depth = 1;
  for (const tag of content.matchAll(/<\/?div\b[^>]*>/gi)) {
    depth += tag[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return htmlToText(content.slice(0, tag.index)) || undefined;
  }
  return undefined;
}

function parseFlightMeditation(raw: string) {
  // Decode actual JSON strings so paragraphs, quotes and Unicode survive intact.
  const packets: string[] = [];
  for (const script of raw.matchAll(/<script\b[^>]*>\s*self\.__next_f\.push\((\[1,[\s\S]*?\])\)\s*;?\s*<\/script>/gi)) {
    try {
      const packet = JSON.parse(script[1]);
      if (typeof packet[1] === "string") packets.push(packet[1]);
    } catch { /* Ignore unrelated or incomplete script packets. */ }
  }
  const flight = packets.join("");

  function findHtml(node: unknown): string | undefined {
    if (!Array.isArray(node)) return undefined;
    const props = node[3];
    if (node[0] === "$" && node[1] === "div" && props
      && /\breading-block\b/.test(props.className ?? "")) {
      const children = props.children;
      const label = children?.[0]?.[3]?.children;
      if (Array.isArray(label) && /^Suy\s+Niệm\s*:?$/i.test(label.join(""))) {
        const html = children?.[2]?.[3]?.dangerouslySetInnerHTML?.__html;
        if (typeof html === "string") return html;
      }
    }
    for (const child of node) {
      const result = findHtml(child)
        ?? (child && typeof child === "object" && !Array.isArray(child)
          ? findHtml(child.children) : undefined);
      if (result !== undefined) return result;
    }
    return undefined;
  }

  for (const line of flight.split("\n")) {
    if (!line.includes('"reading-block"') || !/Suy\s+Niệm/i.test(line)) continue;
    try {
      let html = findHtml(JSON.parse(line.slice(line.indexOf(":") + 1)));
      if (html === undefined) continue;
      if (/^\$[0-9a-f]+$/i.test(html)) {
        const chunk = new RegExp(`(?:^|\n)${html.slice(1)}:T([0-9a-f]+),`, "i").exec(flight);
        if (!chunk) continue;
        const length = Number.parseInt(chunk[1], 16);
        if (length > 240_000) continue;
        const bytes = new TextEncoder().encode(flight.slice(chunk.index + chunk[0].length));
        if (bytes.length < length) continue;
        html = new TextDecoder("utf-8", { fatal: true }).decode(bytes.slice(0, length));
      }
      return htmlToText(html) || undefined;
    } catch { /* Optional content must never prevent loading the Gospel. */ }
  }
  return undefined;
}

export function parseAugustinoReading(raw: string) {
  const decoded = decodeFlightMarkup(raw);
  const gospel = parseGospel(raw, decoded);
  if (!gospel) return null;
  const meditationText = parseRenderedMeditation(raw) ?? parseFlightMeditation(raw);
  return {
    liturgicalDay: parseLiturgicalDay(raw, decoded),
    gospelReference: gospel.reference,
    gospelText: gospel.text,
    ...(meditationText ? { meditationText } : {}),
  };
}
