# Non-ASCII brand logo sources

Issue [#462](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/462) removes the URL and manifest-slug restrictions. It preserves the approved source rule, master formats and trademark decision from #377. Checks below were made on 2026-09-30 against the Commons API revision content and image metadata. No CC or GFDL file is selected.

| Catalog slug | Selection | Pinned evidence |
|---|---|---|
| `москвич` | Commons SVG, PD-textlogo, luminance mask | [File:Logo of Moskvich.svg, revision 1142159688](https://commons.wikimedia.org/w/index.php?title=File:Logo_of_Moskvich.svg&oldid=1142159688). The page uses `PD-logo`, which [redirects to PD-textlogo](https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=Template:PD-logo&redirects=1). PD-textlogo template revision 907865945; rendered page categorizes the file as PD textlogo. No CC/GFDL licence in the file-page content. |
| `tofaş` | Commons SVG, PD-textlogo, luminance mask | [File:TOFAŞ logo (2019-).svg, revision 800293545](https://commons.wikimedia.org/w/index.php?title=File:TOFA%C5%9E_logo_%282019-%29.svg&oldid=800293545). Explicit PD-textlogo and trademarked tags, no CC/GFDL licence. |
| `iž` | No source | [File:ИЖ логотип.jpg, revision 1275195737](https://commons.wikimedia.org/w/index.php?title=File:%D0%98%D0%96_%D0%BB%D0%BE%D0%B3%D0%BE%D1%82%D0%B8%D0%BF.jpg&oldid=1275195737) uses `self|cc-zero`, outside the approved Commons PD-textlogo/PD-shape rule. [File:ИЖ!.JPG, revision 1265979675](https://commons.wikimedia.org/w/index.php?title=File:%D0%98%D0%96!.JPG&oldid=1265979675) is a tape-recorder mark with CC BY-SA/GFDL. Neither is selected. No matching icon in pinned Simple Icons 16.33.0. |
| `паз` | No source | [File:Павловский автозавод - логотип.jpg, revision 1063728838](https://commons.wikimedia.org/w/index.php?title=File:%D0%9F%D0%B0%D0%B2%D0%BB%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9_%D0%B0%D0%B2%D1%82%D0%BE%D0%B7%D0%B0%D0%B2%D0%BE%D0%B4_-_%D0%BB%D0%BE%D0%B3%D0%BE%D1%82%D0%B8%D0%BF.jpg&oldid=1063728838) has PD-textlogo and trademark tags, but is JPEG. The importer accepts SVG/PNG masters. No eligible master selected; no matching icon in pinned Simple Icons 16.33.0. |

Downloaded masters are pinned by sha256 in the manifest:

- Moskvich: `55496e47dbd7d03f0a1b01736dc4bdd3f674ffe005f3886666fe814bf1d73048`, 3,967 bytes, [master](https://upload.wikimedia.org/wikipedia/commons/d/d9/Logo_of_Moskvich.svg).
- Tofaş: `e638737f7d8e33da0c13d4c41d7838c772e0f2aea1db6dc01f90f333d588762e`, 4,735 bytes, [master](https://upload.wikimedia.org/wikipedia/commons/3/32/TOFA%C5%9E_logo_%282019-%29.svg).

The pinned page identifies the checked licence; the hash identifies the downloaded file bytes. A changed upstream file must pass fresh provenance and checksum checks before importing. The importer renders these to PNG masks and serves no SVG. Chrysler and IVECO remain excluded; Kia, DAF and JCB retain their selected sources. Existing imported keys and admin uploads for null-source entries remain untouched. This research makes no new trademark or counsel decision.
