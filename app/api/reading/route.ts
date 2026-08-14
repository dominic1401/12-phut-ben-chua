const SOURCE_ROOT = "https://augustino.net/loi-chua-hom-nay";

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
      .replace(/<sub[^>]*>[\s\S]*?<\/sub>/gi, " ")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

function validDatePart(value: string | null, min: number, max: number) {
  if (!value || !/^\d{1,4}$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return parsed >= min && parsed <= max ? parsed : null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const day = validDatePart(requestUrl.searchParams.get("d"), 1, 31);
  const month = validDatePart(requestUrl.searchParams.get("m"), 1, 12);
  const year = validDatePart(requestUrl.searchParams.get("y"), 2025, 2027);

  if (!day || !month || !year) {
    return Response.json(
      { ok: false, error: "Ngày được yêu cầu không hợp lệ." },
      { status: 400 },
    );
  }

  const dateCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    dateCheck.getUTCDate() !== day ||
    dateCheck.getUTCMonth() !== month - 1 ||
    dateCheck.getUTCFullYear() !== year
  ) {
    return Response.json(
      { ok: false, error: "Ngày được yêu cầu không tồn tại." },
      { status: 400 },
    );
  }

  const sourceUrl = `${SOURCE_ROOT}?d=${String(day).padStart(2, "0")}&m=${String(month).padStart(2, "0")}&y=${year}`;

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "12-Phut-Ben-Chua/1.0 (+private prayer site)",
      },
    });

    if (!response.ok) {
      throw new Error(`Augustino responded with ${response.status}`);
    }

    const raw = await response.text();
    const decoded = decodeFlightMarkup(raw);
    const gospel = parseGospel(raw, decoded);
    if (!gospel) throw new Error("The Gospel block could not be parsed");

    return Response.json(
      {
        ok: true,
        date: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
        liturgicalDay: parseLiturgicalDay(raw, decoded),
        gospelReference: gospel.reference,
        gospelText: gospel.text,
        sourceName: "Augustinô",
        sourceUrl,
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=900, s-maxage=21600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("Daily reading sync failed", error);
    return Response.json(
      {
        ok: false,
        error: "Chưa thể đồng bộ Lời Chúa hôm nay. Vui lòng thử lại sau.",
        sourceUrl,
      },
      {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
