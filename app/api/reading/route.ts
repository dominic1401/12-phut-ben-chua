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

function parseLiturgicalDay(decoded: string) {
  const match = decoded.match(
    /"className":"day-name[^"]*","children":\[([^\]]+)\]/,
  );
  if (!match) return "Phụng vụ Lời Chúa hôm nay";

  return Array.from(match[1].matchAll(/"([^"]*)"|(\d+)/g))
    .map((part) => part[1] ?? part[2] ?? "")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function parseGospel(decoded: string) {
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
        "User-Agent": "10-Phut-Ben-Chua/1.0 (+private prayer site)",
      },
    });

    if (!response.ok) {
      throw new Error(`Augustino responded with ${response.status}`);
    }

    const raw = await response.text();
    const decoded = decodeFlightMarkup(raw);
    const gospel = parseGospel(decoded);
    if (!gospel) throw new Error("The Gospel block could not be parsed");

    return Response.json(
      {
        ok: true,
        date: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
        liturgicalDay: parseLiturgicalDay(decoded),
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
