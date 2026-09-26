import test from "node:test";
import assert from "node:assert/strict";
import { parseAugustinoReading } from "../lib/augustino-reading.ts";

const gospel = `<div class="day-name">Ngày kiểm tra</div>
<div class="reading-block"><p class="font-semibold">Tin Mừng<!-- --> – <span>Mt 1,1-2</span>:</p><hr/><div><p>Bản văn Tin Mừng mẫu dùng để kiểm tra việc phân tách các phần của trang.</p></div></div>`;

function meditation(html) {
  return `<div class="reading-block"><p class="font-semibold">Suy Niệm<!-- -->:</p><hr/><div>${html}</div></div>`;
}

function flightScript(text) {
  return `<script>self.__next_f.push(${JSON.stringify([1, text])})</script>`;
}

function flightBlock(html) {
  return ["$", "div", "Suy Niệm", {
    className: "reading-block",
    children: [
      ["$", "p", null, { className: "font-semibold", children: ["Suy Niệm", ":"] }],
      ["$", "hr", null, {}],
      ["$", "div", null, { dangerouslySetInnerHTML: { __html: html } }],
    ],
  }];
}

test("extracts only the meditation, preserving paragraphs, line breaks and author", () => {
  const article = "<p>Đoạn một &amp; câu hỏi.<br>Hãy dừng lại.</p><div><p>Đoạn hai.</p></div><p><em>Tác giả mẫu</em></p>";
  const raw = gospel + meditation(article)
    + '<div class="reading-block"><p>Cầu nguyện</p><div><p>Không thuộc bài suy niệm.</p></div></div>'
    + "<footer>Chân trang</footer>";
  const result = parseAugustinoReading(raw);
  assert.equal(result.meditationText, "Đoạn một & câu hỏi.\nHãy dừng lại.\n\nĐoạn hai.\n\nTác giả mẫu");
  assert.equal(result.gospelReference, "Mt 1,1-2");
  assert.equal(result.liturgicalDay, "Ngày kiểm tra");
  assert.doesNotMatch(result.gospelText, /Đoạn một|Chân trang/);
});

test("missing, empty or incomplete meditation does not discard a valid Gospel", () => {
  for (const extra of ["", meditation(""), '<p class="font-semibold">Suy Niệm:</p><hr/><div><p>Chưa đủ khối']) {
    const result = parseAugustinoReading(gospel + extra);
    assert.ok(result.gospelText);
    assert.equal(result.meditationText, undefined);
  }
  assert.equal(parseAugustinoReading(meditation("<p>Chỉ có suy niệm.</p>")), null);
});

test("Flight fallback reads the entire UTF-8 text chunk without leaking the next record", () => {
  const html = '<p>Đoạn thứ nhất: “Lắng nghe”.</p>\n<p>Đoạn thứ hai.</p><p>Tác giả mẫu</p>';
  const size = Buffer.byteLength(html).toString(16);
  const stream = `25:T${size},${html}\n24:${JSON.stringify(flightBlock("$25"))}\n26:${JSON.stringify(["$", "footer", null, { children: "Không lấy chân trang" }])}\n`;
  // A text chunk may be split across multiple transport packets.
  const result = parseAugustinoReading(gospel + flightScript(stream.slice(0, 55)) + flightScript(stream.slice(55)));
  assert.equal(result.meditationText, "Đoạn thứ nhất: “Lắng nghe”.\n\nĐoạn thứ hai.\n\nTác giả mẫu");
});

test("Flight inline HTML is decoded, while unavailable chunks remain optional", () => {
  const inline = `24:${JSON.stringify(flightBlock('<p>“Bình an” &amp; hy vọng.</p><p>Đoạn tiếp.</p>'))}\n`;
  assert.equal(parseAugustinoReading(gospel + flightScript(inline)).meditationText, "“Bình an” & hy vọng.\n\nĐoạn tiếp.");
  for (const record of [flightBlock("$ff"), ["$", "div", null, { children: "Suy Niệm" }]]) {
    const result = parseAugustinoReading(gospel + flightScript(`24:${JSON.stringify(record)}\n`));
    assert.ok(result.gospelText);
    assert.equal(result.meditationText, undefined);
  }
});
