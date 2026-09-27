import { parseAugustinoReading } from "@/lib/augustino-reading";

const SOURCE_ROOT = "https://augustino.net/loi-chua-hom-nay";

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
    const reading = parseAugustinoReading(raw);
    if (!reading) throw new Error("The Gospel block could not be parsed");

    return Response.json(
      {
        ok: true,
        date: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
        ...reading,
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
