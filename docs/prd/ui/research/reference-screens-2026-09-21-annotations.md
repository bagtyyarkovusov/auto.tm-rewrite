# Reference screen annotations, release-relevant captures

> Noncanonical research. These notes describe third-party screens captured by the founder. They are not requirements. [ADR-0051](../../../adr/0051-auto-ru-inspired-mobile-discovery-before-google-play-review.md) and the founder-approved AutoTM screen map decide release scope. Index: [reference-screens-2026-09-21.md](reference-screens-2026-09-21.md).

Each row names the screen in plain words, then records the visible state, key controls, where a tap goes, text worth quoting, and what AutoTM should adopt or avoid. For a duplicate capture, the last column names the original. Image files live only in the founder's archive, see the index for paths.


## Home and discovery


### Auto.ru

| ID | Screen | Visible state | Key controls | Transition | Important text | AutoTM: adopt / avoid |
|---|---|---|---|---|---|---|
| AR-01-001 | Home, top | Home tab (Поиск) at top; brand/model search card with total offer count and filter icon; category chips (Services, New, Used, Moto, Commercial); promo banner; "Personal for you" grid starts | Search card "Марка, модель" + filter icon; category chips; header menu, Plus badge, search icon; bottom tabs Поиск/Избранное/Разместить/Сообщения/Бортжурнал | Tap search card opens Параметры (AR-02-002) | "Марка, модель", "19 053 предложения", "Персонально для вас" | Adopt: brand/model entry as the first element on Home with a live count. Avoid: personalized heading and ranking (ADR-0051), Plus loyalty promo, multi-vertical chips. |
| AR-01-002 | Home, scrolled feed | Two-column listing grid under a sticky header | Cards: photo, badge (Fair price / New), favorite heart, price, title, year+mileage | Tap card opens listing detail | "Справедливая цена", "Новый", "от 2 249 000 ₽" | Adopt: two-column card with price first, heart on photo. Avoid: "fair price" valuation badges (no pricing model), dealer "from" prices. |

### Kolesa

| ID | Screen | Visible state | Key controls | Transition | Important text | AutoTM: adopt / avoid |
|---|---|---|---|---|---|---|
| KZ-01-001 | Home, top | Home tab: stories carousel, 2x4 category tile grid (Cars, Car loans, Moto, Parts, New cars, Commercial, Repair, History), feed of single-column listing cards | Stories, category tiles with "New" badges, News link, cards with heart; tabs Kolesa.kz/Favorites/Post/Messages/Cabinet | Cars tile opens cars list (KZ-02-002) | "Машины", "Новости", "первый взнос" | Adopt: card layout title, price, short spec line, city, date. Avoid: stories, multi-vertical tile grid, credit down-payment chips; no brand/model entry on Home (the gap ADR-0051 fixes). |
| KZ-01-002 | Home feed with ad | Full-width third-party grocery ad between listings | Ad card |  | "-30% на 1-ый заказ" | Avoid: third-party ads in feed. |
| KZ-01-003 | Home feed with credit banner and display ad | Credit promo banner; Range Rover display ad | Banner, ad |  | "Купить авто в кредит" | Avoid: credit banners, display ads. |
| KZ-01-004 | Home feed, mixed verticals | Excavator listing next to cars; dealer badge; Kaspi ad | Cards, dealer badge |  | "От дилера", "Caterpillar 320D2 L" | Avoid: mixing verticals in the cars feed (AutoTM is cars-first). |
| KZ-02-001 | Home (duplicate entry frame) | Same as KZ-01-001 |  | Cars tile opens cars list |  | Duplicate of KZ-01-001. |
| KZ-02-002 | Cars list, top | "Машины" screen with back and Filter; subcategory rows with counts (Car loans, New cars, Water transport); "Hot offers" feed | Back, Filter button, category rows, cards; highlighted (promoted) cards in blue | Filter opens filter form (KZ-03-002) | "Машины", "Фильтр", "Горячие предложения" | Adopt: list screen with Filter action in header. Avoid: promoted blue cards (no paid placement), upsell category rows. |
| KZ-02-003 | Cars list, scrolled | Floating "Refine search" tooltip over Filter; promoted cards; history badge; price-drop promo | Tooltip, cards |  | "Уточните поиск", "Продавец снизил цену авто" | Adopt: a nudge toward filters after browsing a while is worth considering. Avoid: promoted placement, price-drop upsell. |
| KZ-02-004 | Cars list, price-drop card and ad | Price shown with green down arrow; display ad | Card with price-drop indicator |  | "5 200 000 ₸" | Consider: price-drop indicator only if price history exists. Avoid: ads. |

## Brand/model and filters


### Auto.ru

| ID | Screen | Visible state | Key controls | Transition | Important text | AutoTM: adopt / avoid |
|---|---|---|---|---|---|---|
| AR-02-001 | Home (duplicate entry frame) | Same as AR-01-001 | as AR-01-001 | Tap search card | as AR-01-001 | Duplicate of AR-01-001. |
| AR-02-002 | Parameters sheet, top | Full-screen filter form opened from Home search card; nothing selected; Reset disabled | Close X, Reset; vertical tabs Cars/Commercial/Moto; segment All/New/Used; region+radius row; reports-filter row; "Марка и модель, Добавить"; main params Price, Mileage, Year, Body; sticky CTA | Add brand opens brand list (AR-08); CTA opens results | "Параметры", "Марка и модель", "Добавить", "Показать 19 053 предложения и ещё 714 859 в других городах" | Adopt: one parameters screen with brand/model block near the top, sticky "Show N" CTA with live count, Reset. Avoid: vertical tabs, paid report filters, out-of-region upsell count. |
| AR-02-003 | Parameters sheet, mid | Scrolled; gearbox/engine/availability rows; collapsed "Additional parameters (12 more)"; Owner segment Private/Company; PTS rows; customs=cleared | Collapsible advanced section; segment chips; rows opening pickers | Expanding reveals AR-02-004 | "Дополнительные параметры", "ещё 12 параметров", "Показать 2 052 предложения" | Adopt: progressive disclosure of rarely used filters behind "more". Avoid: Russia-specific PTS/customs fields unless TM has an equivalent. |
| AR-02-004 | Parameters sheet, advanced expanded | Advanced section expanded: displacement, drive, power, steering, color, options, condition | Row list; collapse chevron |  | "Объем двигателя", "Привод", "Руль", "Цвет" | Adopt: keep advanced rows collapsed by default. Avoid: filters AutoTM listings do not capture. |
| AR-02-005 | Parameters sheet, advanced cont. | Condition=Except damaged; acceleration, clearance, consumption, listing age; toggle chips (warranty, exchange, VAT, credit, verified, photo only) | Multi-toggle chips |  | "Кроме битых", "Только с фото", "Возможен обмен" | Adopt: "photo only" and "exchange possible" style boolean chips if the data exists. Avoid: VAT, credit, manufacturer-verified. |
| AR-02-006 | Parameters sheet, bottom | End of form: Owner block, PTS, customs; CTA still sticky | as above | CTA to results | "Показать 2 052 предложения" | Same as AR-02-003/005; confirms sticky CTA at every scroll depth. |
| AR-06-002 | Home (flow start) | Duplicate of AR-01-001 |  | Tap search card |  | Duplicate of AR-01-001. |
| AR-06-003 | Parameters, empty | Empty form, region unset, count 744 035 | Region row | Opens region | "Выбрать регион" | Duplicate of AR-10-001. |
| AR-06-004 | Radius sheet | Region Moscow, +100 km selected, Apply 162 835 | Radius chips |  | "Регион и радиус" | Duplicate of AR-10-005. |
| AR-06-005 | Parameters with region | Moscow +100 km set | Clear X |  | "Москва +100 км" | Duplicate of AR-10-006. |
| AR-06-006 | Reports filter sheet | Sheet "Free check": no accidents, specs match PTS, owners match PTS, no legal restrictions; Apply 162 835 | Checkboxes, Reset, Apply |  | "Бесплатная проверка", "Без ДТП" | Avoid: needs vehicle-history data AutoTM lacks. |
| AR-06-007 | Reports filter, one checked | "No accidents" checked; Apply count drops to 104 349 | Checkbox |  | "Применить 104 349 предложений" | Avoid (data). The pattern of a per-sheet Apply button showing the resulting count repeats in every sheet below. |
| AR-06-008 | Parameters with report filter | Reports row shows "1 parameter selected" | Clear X |  | "Выбран 1 параметр" | Avoid (reports). |
| AR-06-009 | Brand picker, Exclude mode | Exclude segment active | Segment |  | "Исключить" | Duplicate of AR-09-003. |
| AR-06-010 | Model picker, all selected for exclusion |  |  |  |  | Duplicate of AR-09-005. |
| AR-06-011 | Parameters with exclusion |  |  |  |  | Duplicate of AR-09-006. |
| AR-06-012 | Brand picker, Choose mode |  |  |  |  | Duplicate of AR-08-002. |
| AR-06-013 | Model picker, Audi multi-selected |  |  |  |  | Duplicate of AR-08-005. |
| AR-06-014 | Parameters with Audi models and exclusion |  |  |  |  | Duplicate of AR-08-006. |
| AR-06-015 | Parameters, main params visible | Excluded row at top; main parameters list (price, mileage, year, body, gearbox, engine, availability); collapsed additional section | Rows | Tapping a row opens its sheet | "Основные параметры" | Adopt: each filter row opens a focused bottom sheet rather than inline inputs. |
| AR-06-016 | Price sheet, empty | Bottom sheet "Price, ₽" with from/to fields showing min/max placeholders; numeric keypad; Apply 2 052 | From/to inputs, Reset, Apply with count | Apply closes sheet | "Цена, ₽", "от 170,000", "до 32,000,000" | Adopt: from/to price with placeholders showing the real range; numeric keypad; per-sheet Apply with live count. |
| AR-06-017 | Price sheet, filled | 500 000 to 1 854 000 entered; Apply 657 | Inputs |  | "Применить 657 предложений" | Adopt: count updates as values are typed. |
| AR-06-018 | Parameters with price | Price row "from 500,000 to 1,854,000" with clear X; CTA 657 | Clear X |  | "от 500,000 до 1,854,000" | Adopt: filled row summary with clear. |
| AR-06-019 | Mileage sheet, empty | Two-wheel picker from/to | Wheel pickers |  | "Пробег, км" | Consider mileage filter: AutoTM listings capture mileage but the filter contract does not expose it yet. |
| AR-06-020 | Mileage sheet, set | 110 000 to 260 000; Apply 443 | Wheel pickers |  | "от 110,000 до 260,000" | As above. Wheel pickers are faster than typing for bounded ranges. |
| AR-06-021 | Parameters with mileage | Mileage row filled; CTA 443 | Clear X |  |  | Same pattern as AR-06-018. |
| AR-06-022 | Year sheet, empty | Two-wheel year picker | Wheel pickers |  | "Год выпуска" | Adopt: year range as two wheels (AutoTM already filters by year). |
| AR-06-023 | Year sheet, set | 2007 to 2020; Apply 385 | Wheel pickers |  | "от 2007 до 2020" | Adopt. |
| AR-06-024 | Parameters with year | Year row filled; CTA 385 | Clear X |  |  | Same pattern. |
| AR-06-025 | Body sheet | Grid of body-type illustrations with checkboxes (sedan, liftback, hatch 3d/5d, SUV, wagon, coupe, cabrio); Apply 385 | Illustrated checkbox grid |  | "Кузов", "Седан", "Внедорожник 5 д." | Consider: body type is captured by AutoTM listings; illustrated grid is optional. Keep AutoTM icon style. |
| AR-06-026 | Body sheet, five selected | Sedan, liftback, wagon, coupe, cabrio checked; Apply 245 | Checkboxes |  | "Применить 245 предложений" | As above. |
| AR-06-027 | Parameters with body | Body row lists selected types; CTA 245 | Clear X |  | "Универсал, Кабриолет, Купе, Седан, Лифтбек" | Adopt: comma-joined summary truncated with ellipsis. |
| AR-06-028 | Gearbox sheet | Automatic group (automatic, robot, CVT) and manual, checkboxes | Grouped checkboxes |  | "Коробка", "Автомат", "Механика" | Consider: transmission is a listing field; a two-option Automatic/Manual is enough for TM. |
| AR-06-029 | Gearbox sheet, automatic group checked | All automatic subtypes checked; Apply 241 | Parent checkbox |  |  | Parent/child checkbox pattern; avoid for release. |
| AR-06-030 | Parameters with gearbox | Gearbox row "Automatic" | Clear X |  | "Автомат" | Same pattern. |
| AR-06-031 | Engine sheet | Petrol, diesel, hybrid checkboxes | Checkboxes |  | "Двигатель", "Бензин", "Дизель", "Гибрид" | Consider: fuel type is a listing field. |
| AR-06-032 | Engine sheet, petrol checked | Apply 228 | Checkbox |  |  | As above. |
| AR-06-033 | Parameters with engine | Engine row "Petrol" | Clear X |  |  | Same pattern. |
| AR-06-034 | Availability sheet | Radio: any, in stock, in transit, to order | Radio list |  | "Наличие" | Avoid: dealer stock status. |
| AR-06-035 | Parameters, additional collapsed | "Additional parameters … 12 more" collapsed; owner block | Expander |  | "ещё 12 параметров" | Adopt: progressive disclosure. |
| AR-06-036 | Additional expanded | Engine volume, drive, power, steering, color, options, condition | Rows |  |  | See AR-02-004. |
| AR-06-037 | Engine volume sheet, empty | Wheel picker 0.1 steps | Wheels |  | "Объем двигателя, л" | Defer. |
| AR-06-038 | Engine volume sheet, 1 to 4 | Set 1 to 4; Apply 222 | Wheels |  |  | Defer. |
| AR-06-039 | Parameters with engine volume | Row "from 1 to 4" | Clear X |  |  | Defer. |
| AR-06-040 | Drive sheet | Front, all-wheel checkboxes | Checkboxes |  | "Привод", "Передний", "Полный" | Defer unless listings capture drive. |
| AR-06-041 | Drive sheet, both checked | Apply 222 | Checkboxes |  |  | Defer. |
| AR-06-042 | Parameters with drive | Row "All-wheel, Front" | Clear X |  |  | Defer. |
| AR-06-043 | Power sheet, empty | Wheel picker | Wheels |  | "Мощность, л.с." | Defer. |
| AR-06-044 | Power sheet, 130 to 260 | Apply 176 | Wheels |  |  | Defer. |
| AR-06-045 | Parameters with power | Row filled | Clear X |  |  | Defer. |
| AR-06-046 | Steering sheet | Left/right radio | Radio |  | "Руль", "Левый", "Правый" | Avoid for TM release. |
| AR-06-047 | Parameters with steering | Row "Left" | Clear X |  |  | Avoid. |
| AR-06-048 | Color sheet | Grid of 16 color swatches with names | Swatches |  | "Цвет" | Consider: color is a listing field; swatch grid is clear and language-light. |
| AR-06-049 | Color sheet, several selected | Checked swatches; Apply 159 | Swatches |  |  | As above. |
| AR-06-050 | Additional with color | Color row lists five colors | Clear X |  | "Пурпурный, Красный, Голубой…" | Same pattern. |
| AR-06-051 | Options screen | Full-screen "Options" with count subtitle; grouped equipment (Safety, Comfort) with expandable rows and radios | Back, Reset, groups, Apply |  | "Опции", "Безопасность", "Подушки безопасности" | Avoid: equipment taxonomy AutoTM does not capture. |
| AR-06-052 | Options, airbag group expanded | Sub-options listed | Expanded group |  |  | Avoid. |
| AR-06-053 | Additional list continued | Condition "except damaged"; engine/HBO, acceleration, clearance, consumption, listing age; toggle chips | Rows, chips |  | "Кроме битых", "Срок размещения" | Consider "listing age" later. Avoid most rows. |
| AR-06-054 | Engine type & HBO sheet | Turbo, atmospheric, gas equipment checkboxes | Checkboxes |  | "Тип двигателя и ГБО" | Avoid. |
| AR-06-055 | Additional list | Same as AR-06-053 |  |  |  | Near-duplicate of AR-06-053 (not byte-identical). |
| AR-06-056 | Acceleration sheet, empty | Wheel picker | Wheels |  | "Разгон до 100 км/ч, сек." | Avoid. |
| AR-06-057 | Acceleration sheet, 3 to 10 | Wheels |  |  |  | Avoid. |
| AR-06-058 | Additional with acceleration | Row filled | Clear X |  |  | Avoid. |
| AR-06-059 | Clearance sheet, empty | Single wheel | Wheel |  | "Клиренс от, мм" | Avoid. |
| AR-06-060 | Clearance sheet, 130 | Apply 124 | Wheel |  |  | Avoid. |
| AR-06-061 | Additional with clearance | Row filled; CTA 124 | Clear X |  |  | Avoid. |
| AR-06-062 | Consumption sheet, empty | Single wheel | Wheel |  | "Расход на 100 км до, л" | Avoid. |
| AR-06-063 | Consumption sheet, 10 | Apply 120 | Wheel |  |  | Avoid. |
| AR-06-064 | Additional with consumption | Row filled; chips | Clear X |  |  | Avoid. |
| AR-06-065 | Owner block | Owner segment All/Private/Company; PTS rows; customs | Segment |  | "Владелец", "Частник", "Компания" | Consider: private vs dealer filter if AutoTM distinguishes seller types. |
| AR-06-066 | Owner = Private, photo-only chip on | Count 112 | Segment, chip |  | "Только с фото" | Adopt "only with photos" if cheap. |
| AR-06-067 | PTS type sheet | Original/electronic, duplicate, any | Radio |  | "Тип ПТС" | Avoid (Russia-specific). |
| AR-06-068 | Owner block with PTS | PTS row filled; count 88 | Clear X |  |  | Avoid. |
| AR-06-069 | Owners-by-PTS sheet | One, ≤2, ≤3, any | Radio |  | "Владельцев по ПТС" | Avoid. |
| AR-06-070 | Owner block | Same as AR-06-068 |  |  |  | Near-duplicate of AR-06-068. |
| AR-06-071 | Customs sheet | Cleared, not cleared, any | Radio |  | "Таможня" | Avoid (Russia-specific). |
| AR-06-072 | Owner block final | Count 88 |  | CTA opens results | "Показать 88 предложений" | Same as AR-06-068. |
| AR-06-073 | Results after full filter | Results screen with 88 offers and chips |  |  |  | Duplicate of AR-05-001. |
| AR-08-001 | Parameters with exclusion only | Brand block shows an Excluded Lada entry, no included brand; count 98 162 | Add, clear X | Add opens brand list | "Исключили", "Все модели" | Reference for exclusion state; defer exclusion for release. |
| AR-08-002 | Brand picker | Full screen "Марка" with search field, Choose/Exclude segment, groups (Chinese, Foreign, Domestic), Popular list with logos; Apply CTA | Back, search, segment, group rows, logo rows, Apply | Tap brand opens model list (AR-08-004) | "Марка", "Поиск марки", "Популярные", "Применить" | Adopt: full-screen brand list with search on top and a Popular section with logos. Avoid: origin groups unless catalog groups exist; exclude mode (defer). |
| AR-08-003 | Brand search typing | Search field focused, "Audi" typed; results collapse to matching brand; Cancel | Search field, clear, Cancel | Tap result opens models | "Audi", "Отменить" | Adopt: type-ahead filter over brand list. |
| AR-08-004 | Model picker | "Модель" list for Audi: Select all, Popular models with radio circles; some rows expand to generations | Back, search, select-all, multi-select circles, chevrons, Apply | Apply returns to Parameters | "Модель", "Выбрать все", "Популярные" | Adopt: model list with search and "all models" option. Consider single vs multi-select explicitly. Avoid: generation drill-down. |
| AR-08-005 | Model picker, multi-selected | Nine models checked; "All models" section below | Checked circles, Apply | Apply returns with models summarized | "Все модели", "Применить" | Adopt only if AutoTM supports multi-model filters; otherwise single model. |
| AR-08-006 | Parameters after brand/model | Brand Audi, models listed, generation empty, exclusion listed; CTA 2 052 | Rows with clear X | CTA to results | "Показать 2 052 предложения" | Adopt: summary of chosen brand/model in the form with per-row clear and updated count. |
| AR-09-001 | Parameters, empty brand block | Empty filter form, count 104 329 | Add brand | Add opens brand picker | "Добавить" | Same pattern as AR-02-002. |
| AR-09-002 | Brand picker, Choose mode | As AR-08-002 | Choose/Exclude segment |  | "Выбрать", "Исключить" | See AR-08-002. |
| AR-09-003 | Brand picker, Exclude mode | Segment switched to Exclude; list identical | Segment | Tap brand opens model list for exclusion | "Исключить" | Defer: exclusion adds state the release does not need. |
| AR-09-004 | Model picker for excluded brand | Lada models, none selected | Select all, circles |  | "Выбрать все" | Defer (exclusion). |
| AR-09-005 | Model picker, all selected | All Lada models checked | Select all checked | Apply returns | "Выбрать все" | Defer (exclusion). |
| AR-09-006 | Parameters with exclusion | Excluded Lada, all models, count drops to 98 162 | Clear X per row |  | "Исключили" | Defer (exclusion). Shows exclusion rendered in red label. |
| AR-10-001 | Parameters, no region | Region row "Choose region"; count 744 035 | Region row chevron | Opens region list | "Выбрать регион" | Adopt: region as its own row at the top of the form (AutoTM: city/velayat). |
| AR-10-002 | Region list | Full-screen region list with search, "All regions", country, oblasts with expand chevrons and radio circles; Reset | Back, search, expandable rows, circles, Apply | Expand shows cities | "Регион", "Город, населённый пункт", "Все регионы" | Adopt: searchable list with "all regions" first; TM needs only velayats and cities, so one level may suffice. |
| AR-10-003 | Region list, city selected | Moscow oblast expanded, Moscow checked (red) | Checked circle | Apply opens radius sheet | "Москва" | Adopt: hierarchical expand if TM data needs it. |
| AR-10-004 | Radius sheet | Bottom sheet over form: region Moscow, radius chips with per-radius counts, +200 selected; Apply with count | Radius chips, Reset, Apply | Apply returns to form | "Регион и радиус", "+200 км 184 263" | Avoid for release: radius needs geocoded listings. Counts on each option are a strong feedback pattern. |
| AR-10-005 | Radius sheet, +100 selected | Same with +100 km; Apply shows 162 835 | as above |  | "+100 км" | Avoid (radius). |
| AR-10-006 | Parameters with region | Region row shows "Москва +100 км" with clear X; count 162 835 | Clear X |  | "Москва +100 км" | Adopt: filled row with clear X. |

### Kolesa

| ID | Screen | Visible state | Key controls | Transition | Important text | AutoTM: adopt / avoid |
|---|---|---|---|---|---|---|
| KZ-03-001 | Cars list (entry frame) | Same as KZ-02-002 | Filter button | Opens filter |  | Duplicate of KZ-02-002 content with different status bar; tap Filter. |
| KZ-03-002 | Filter form | Full-screen "Фильтр": condition segment All/New/Used; Region row; "Brand, model, Add"; year from/to; price from/to; credit toggle; below-average-price (Plus); history toggle; "Show extended filter"; subscribe toggle; sticky "Show 185 684 listings" | Close X, Reset, segment, rows, range inputs, toggles, expander, CTA | Region row opens KZ-03-003; Add opens brand list | "Фильтр", "Марка, модель", "Год выпуска", "Цена, ₸", "Показать 185 684 объявления" | Adopt: compact form order (condition, region, brand/model, year, price) with range inputs inline and a sticky counted CTA. Avoid: credit and paid "below average price" filters, subscribe toggle. |
| KZ-03-003 | Region picker | Search field, All regions checked, Popular cities with checkboxes, all oblasts with chevrons | Search, checkboxes, chevrons, Reset |  | "Регион", "Популярные города" | Adopt: popular cities first, then full list; for TM, Ashgabat plus velayat centers. |
| KZ-03-004 | Region picker, city chosen | Almaty checked; CTA "Choose 1 region" | Checkbox, CTA with selection count | CTA returns to filter | "Выбрать 1 регион" | Adopt: CTA text reflects selection count. |
| KZ-03-005 | Filter form with region | Region = Almaty with clear icon; count drops to 49 630 | Clear icon on filled row |  | "Алматы", "Показать 49 630 объявлений" | Adopt: live count update after each change. |
| KZ-03-006 | Brand picker with exclude tooltip | Dimmed list; tooltip explaining Exclude | Choose/Exclude segment, tooltip close |  | "Исключайте авто, которые вас не интересуют" | Defer exclusion. Onboarding tooltip pattern is reusable. |
| KZ-03-007 | Brand picker | Choose/Exclude segment, brand search, "Country of origin" row, popular brands with logos, all brands A to Z | Search, rows with chevrons | Tap brand opens model list | "Марка", "Поиск по марке", "Популярные марки", "Все марки" | Adopt: popular-with-logos then A to Z list; same as AR-08-002, confirming the pattern across both apps. |
| KZ-03-008 | Model picker (BMW) | Model search, Select all, popular models, all models grouped by series with checkboxes | Search, checkboxes |  | "Поиск по модели", "Популярные модели", "Все модели" | Adopt: popular models first then all models. Avoid: series grouping unless catalog has it. |
| KZ-03-009 | Model picker, X5 checked | CTA "Choose 1 model" | Checkbox, CTA | CTA returns to filter | "Выбрать 1 модель" | Adopt: count-aware CTA. |
| KZ-03-010 | Filter with BMW X5 | Brand/model row filled "BMW / X5" with clear; Generation row with red dot; second brand/model Add row; count 631 | Clear, Add generation, Add another brand |  | "Марка, модель, поколение", "Показать 631 объявление" | Adopt: filled summary row. Avoid: multiple brand rows and generation for release. |
| KZ-03-011 | Filter, extended section | Year from 2020; history and photo checkboxes; extended filters shown (private sellers Plus, customs cleared, with photo); count 30 | Range input with clear, checkboxes, Plus badges | CTA opens results | "С фото", "Показать 30 объявлений" | Adopt: "with photo" checkbox. Avoid: paywalled filters (Plus). |
| KZ-03-012 | Filtered results | "Машины" results: count "30 listings", sort icon, Filter with badge 5, subscribe button; cards | Back, sort, Filter badge, subscribe | Card opens detail | "30 объявлений", "Фильтр 5" | Adopt: count + filter badge on results. Avoid: subscribe. Note: no active-filter chips, unlike Auto.ru (AR-05-001), so the buyer cannot see what is applied without reopening the form. |

## Results and listing detail


### Auto.ru

| ID | Screen | Visible state | Key controls | Transition | Important text | AutoTM: adopt / avoid |
|---|---|---|---|---|---|---|
| AR-05-001 | Results screen, filtered | Distinct results screen: header "88 offers" + price range subtitle; condition segment; applied brand/model card "Audi A3, +8 / choose generation"; horizontal chip row starting with "Filters (18)" badge then removable value chips; full-width card with 2-photo strip | Back, sort icon, saved-search icon; segment All/New/Used; brand card with clear X; Filters chip with count badge; removable chips; card heart | Filters chip reopens Parameters (AR-05-002); card opens detail | "88 предложений", "670 000  to  1 850 000 ₽", "Фильтры 18", "от 500 тыс. до 1.9 млн. ₽" | Adopt: separate results route with count in header, active-filter chips each removable, a Filters chip with count badge, brand/model summary card. Avoid: saved-search bell (out of scope), "free history" report badges. |
| AR-05-002 | Parameters, reopened from results | Filter form with existing state: Moscow +100 km, Audi with 9 models, generation empty, excluded Lada; CTA shows 88 | Brand block with Brand/Model/Generation rows and clear X; Excluded collapsible; sticky CTA | CTA returns to results | "Марка", "Модель A3, A4, A5…", "Исключили Lada (ВАЗ)", "Показать 88 предложений" | Adopt: editing filters from results opens the same form pre-filled; clear per row. Avoid: generation level unless catalog has it; exclusion (defer). |
| AR-05-003 | Results, scrolled | Filter chips move to a floating bottom bar above tabs when scrolling | Floating chip bar: Filters (18), price range chip |  | "Фильтры 18" | Adopt: keep filter access reachable after scroll (sticky header or floating bar). Avoid: badges tied to Auto.ru valuation. |
| AR-05-004 | Results, scrolled further | Card with "Only on Auto.ru" and history badges; floating chips show mileage and region | Floating chips incl. "Москва +100 км" |  | "Только на Авто.ру", "Справедливая цена" | Adopt: region visible as a chip. Avoid: exclusivity/valuation badges. |
| AR-05-005 | Results, empty | "New" segment returns 0; empty illustration; save-search promo card | Segment; chips; subscribe button |  | "Ничего не найдено", "Подписаться" | Adopt: explicit empty state that keeps filter chips visible so the buyer can loosen them. Avoid: subscription CTA (saved searches out of scope). |
| AR-05-006 | Results, Used segment | 97 offers with Used selected; chips include Year | as AR-05-001 |  | "97 предложений" | Adopt: segment switch updates count in place. |
| AR-05-007 | Sort sheet | Bottom sheet over results listing 11 sort orders; Relevance checked | Close X; single-select list | Selecting closes sheet and re-sorts | "Сортировать по", "Актуальности", "Дате размещения", "Возрастанию цены" | Adopt: sort as a sheet from results header, few options (newest, price asc/desc, year, mileage). Avoid: relevance/uniqueness/valuation sorts that need ranking models. |
| AR-11-002 | Results, tapping into a card | Results for Audi, 97 offers; toast "Change search in Favorites / Open" | As AR-05-001 plus toast | Tap card opens detail (AR-11-003) | "Изменить поиск можно в разделе «Избранное»" | Adopt: result state survives the detail round trip (ADR-0051). Avoid: saved-search toast. |
| AR-11-003 | Listing detail, top | Photo gallery hero, favorite and more in header; title, price, fair-price badge, credit line; free-history promo; date, city, view count; specs grid begins; sticky Call + Chat bar | Back, heart, more; photo swipe; sticky green Call (24h) + chat icon | Photo tap opens full-screen gallery (AR-11-004) | "Audi A6, IV (C7), 2013", "1 500 000 ₽", "17 августа, Москва", "Позвонить" | Adopt: price and title immediately under photos; date+city line; sticky contact bar with Call and Chat. Avoid: credit, valuation, view counters, history-report promos. |
| AR-11-004 | Full-screen photo viewer | Black background, 1/12 counter, heart; bottom actions View report and Call | Close X, counter, heart, swipe | Close returns to detail | "1/12", "Смотреть отчёт" | Adopt: full-screen viewer with index counter and close. Avoid: report CTA. |
| AR-11-005 | Listing detail, specs | Header collapses to price + title; icon specs grid (year, mileage, power, gearbox, drive, color); table rows trim, body, owners, tax; More button; car history section | Collapsing header, More | More expands all specs | "Характеристики", "Подробнее" | Adopt: collapsing header showing price+title once hero scrolls away; two-column key-spec grid of fields AutoTM captures. Avoid: tax estimate, VIN history. |
| AR-11-006 | Listing detail, history report | Vehicle history checks list and paid "Buy from 119 ₽" | Rows with chevrons, green buy button |  | "История автомобиля", "Купить от 119 ₽" | Avoid: paid history reports (no data source, out of scope). |
| AR-11-007 | History promo sheet | Bottom sheet explaining free report if buyer contacts seller; Call and Write buttons | Call, Write |  | "Позвонить", "Написать" | Avoid. |
| AR-11-008 | Listing detail, seller comment and quick questions | Seller comment text; "Ask the seller" chips (Still for sale? Exchange? Bargain? Where to view?) and prefilled message field with send; equipment groups with counts | Question chips, message input, send | Send opens chat | "Комментарий продавца", "Спросите у продавца", "Ещё продаётся?" | Adopt: inline quick-question chips that start a Conversation (AutoTM already has static quick replies). Avoid: equipment taxonomy unless captured. |
| AR-11-009 | Listing detail, credit calculator | Bank credit selection with sliders and form | Sliders, form fields, submit |  | "Подбор кредита в разных банках" | Avoid: financing (out of scope). |
| AR-11-010 | Listing detail, seller block | Consent text; seller card name, "Private person", avatar; address with map pin; recommendations start | Seller card, map pin |  | "Частное лицо", "Москва, Совхозная улица" | Adopt: seller card with name and private/company label plus city. Avoid: street-level address by default. |
| AR-11-011 | Listing detail, bottom | "We recommend" grid of similar cars; special offers carousel | Cards with hearts | Card opens another detail | "Рекомендуем", "Спецпредложения" | Adopt only a non-personalized "similar listings" (same brand/model) if cheap. Avoid: "recommended"/special offers (ADR-0051 bars personalization, no paid placement). |

### Kolesa

| ID | Screen | Visible state | Key controls | Transition | Important text | AutoTM: adopt / avoid |
|---|---|---|---|---|---|---|
| KZ-04-001 | Results (sort entry) | Duplicate of KZ-03-012 | Sort icon | Opens sort sheet |  | Duplicate of KZ-03-012. |
| KZ-04-002 | Sort sheet | Bottom sheet: newest first (checked), oldest, price desc/asc, year newer/older, price+year | Close X, list | Select re-sorts | "Сортировка", "Сначала свежие объявления" | Adopt: this short list is closer to AutoTM's data than Auto.ru's 11 options. |
| KZ-04-003 | Results re-sorted | Results after choosing a sort order | as KZ-03-012 |  | "31 500 000 ₸" | Confirms sort applies in place without leaving results. |
| KZ-07-001 | Results with large card | Results "621 listings", Filter badge 2; first card is a large promoted card with inline Write and Call buttons | Card with Write/Call, heart | Tap card opens detail | "621 объявление", "Написать", "Позвонить" | Adopt: nothing new. Avoid: promoted large cards. |
| KZ-07-002 | Listing detail, top | Photo hero 1/9 with dealer logo; share, heart; title, price, history badge; credit block; spec table (city, generation, body, engine, drive); sticky Write + Call bar | Back, share, heart, credit button, sticky Write/Call | Write opens chat | "BMW X5, 2022 года", "47 000 000 ₸", "Написать", "Позвонить" | Adopt: sticky two-button contact bar with Write (Conversation) and Call; spec table as label/value rows; share action. Avoid: credit calculator. |
| KZ-07-003 | Listing detail, seller comment and loan | Collapsed header with title+price; seller comment with "more" and "Show translation"; car loan calculator; history teaser | Collapsing header, expand, translation link, loan inputs |  | "Комментарий продавца", "Показать перевод" | Adopt: truncated description with "more". Consider: translation (Russian/Turkmen) later. Avoid: loan calculator. |
| KZ-07-004 | Listing detail, history paywall | Paid history report checklist, "Buy for 990 ₸" | Buy button |  | "Купить за 990 ₸" | Avoid (paid reports). |
| KZ-07-005 | Listing detail, price analytics and similar | Average price gauge; similar listings carousel; "New cars for you" | Gauge, carousels | Card opens detail | "Средняя цена на Kolesa.kz", "Похожие объявления" | Avoid price gauge (no dataset). Similar-listing carousel is optional and must not be personalized. |
| KZ-07-006 | Listing detail, owner reviews | Owner reviews of the model with votes | Review cards, "21 reviews" link |  | "Отзывы владельцев" | Avoid (reviews out of scope). |
| KZ-07-007 | Listing detail, footer | Display ad; "Report listing" button; listing ID, date, view count | Report button | Report opens complaint flow | "Пожаловаться на объявление", "ID: 220301974" | Adopt: visible Report listing action and listing ID/date footer. Google Play UGC policy needs in-app reporting. Avoid: ads. |
| KZ-12-001 | Listing detail (call entry) | Duplicate of KZ-07-002 | Call button | Call opens seller contacts sheet |  | Duplicate of KZ-07-002. |
| KZ-12-002 | Seller contacts sheet | Bottom sheet "Seller contacts" with yellow prepayment warning and "More" link, phone number row (blurred in capture) | Close X, warning link, phone row | Tap phone opens system call prompt | "Контакты продавца", "Никогда не отправляйте предоплату" | Adopt: show the anti-prepayment warning at the moment the buyer reveals the phone number. Price-change "Plus" link: avoid. |
| KZ-12-003 | System call confirmation | iOS call prompt over the contacts sheet | Call / Cancel | Hands off to the phone app | "Позвонить +7…", "Отменить" | Adopt: hand off to the OS dialer; no in-app calling. |

## Favorites


### Auto.ru

| ID | Screen | Visible state | Key controls | Transition | Important text | AutoTM: adopt / avoid |
|---|---|---|---|---|---|---|
| AR-36-001 | Favorites, listings empty | Favorites tab with segment Listings/Searches/Comparisons; "Hide sold" toggle on; empty state "No active listings" | Segment, toggle |  | "Избранное", "Скрыть проданные", "Нет активных объявлений" | Adopt: empty state that points back to browsing; a hide-sold toggle if sold listings stay in favorites. Avoid: Searches and Comparisons segments (out of scope). |
| AR-36-002 | Favorites, listing saved | Tooltip "We hid sold listings"; saved card with Call and Write buttons, filled heart; Recommendations block below | Card with Call/Write, heart | Write opens chat | "Скрыли проданные", "Позвонить", "Написать" | Adopt: saved card with direct contact actions and filled heart to remove; explain hidden sold items. Avoid: recommendations block. |

### Kolesa

| ID | Screen | Visible state | Key controls | Transition | Important text | AutoTM: adopt / avoid |
|---|---|---|---|---|---|---|
| KZ-26-001 | Home (Favorites entry frame) | Duplicate of KZ-01-001 |  | Tap Favorites tab |  | Duplicate of KZ-01-001. |
| KZ-26-002 | Favorites, listings empty | Favorites tab: segment Listings/Searches/Sellers; empty illustration; "Search listings" CTA | Segment, CTA | CTA goes to browse | "Избранные объявления", "Искать объявления" | Adopt: empty state with one CTA back to browsing. |
| KZ-26-003 | Favorites, one listing | Saved card: title link, price, credit chip, photo, spec text, city, date/views/likes, filled heart | Card, heart | Card opens detail | "BMW X5", "58 500 000 ₸" | Adopt: saved card reuses the results card. Avoid: credit chip. |
| KZ-26-006 | Favorites, sellers empty | Sellers segment empty state | CTA |  | "Избранные продавцы" | Reference only (seller following out of scope). |

## Saved searches (reference only)


### Auto.ru

| ID | Screen | Visible state | Key controls | Transition | Important text | AutoTM: adopt / avoid |
|---|---|---|---|---|---|---|
| AR-36-003 | Favorites, saved searches | Searches segment: widget promo, saved search cards with filter summary and push toggle | Search cards, push toggles |  | "Поиски", "Пуш-уведомления" | Reference only: saved searches excluded by ADR-0051. |
| AR-36-007 | Saved searches, swipe to delete | Swipe reveals red delete | Swipe action |  |  | Reference only (saved searches). Swipe-to-remove is a reusable pattern for favorites. |
| AR-36-008 | Saved searches, empty | Empty state "Searches, save searches…" |  |  | "Поиски" | Reference only. |

### Kolesa

| ID | Screen | Visible state | Key controls | Transition | Important text | AutoTM: adopt / avoid |
|---|---|---|---|---|---|---|
| KZ-26-004 | Favorites, searches empty | Searches segment empty state | CTA |  | "Избранные поиски" | Reference only (saved searches excluded). |
| KZ-26-005 | Favorites, saved search | Saved search row with notifications toggle | Row, more, toggle |  | "Все марки и модели" | Reference only. |

## Conversations


### Auto.ru

| ID | Screen | Visible state | Key controls | Transition | Important text | AutoTM: adopt / avoid |
|---|---|---|---|---|---|---|
| AR-37-001 | Listing detail (chat entry) | Detail with view-count banner; sticky Call (hours 9 to 21) and chat icon | Chat icon in sticky bar | Chat icon opens new Conversation (AR-37-002) | "Позвонить с 9:00 до 21:00" | Adopt: seller's call hours under Call if AutoTM stores them. Avoid: view-count pressure banners. |
| AR-37-002 | New Conversation | Thread header: seller name, last seen, more, phone; pinned listing strip with thumb, title, price; empty thread; quick-reply chips above composer | Back, more, call, listing strip, chips, attach, input, send | Listing strip opens detail | "Был(а) в 16:59", "Здравствуйте, ещё продаётся?" | Adopt: pinned listing context strip at top of thread; quick replies for the first message (AutoTM already ships these). Consider attachments later. |
| AR-37-003 | Conversation, first message sent | Outgoing bubble with double tick; quick-reply chips remain; keyboard open | Bubble, read ticks, chips, composer |  | "Сегодня", "Обмен интересует?" | Adopt: date separator, delivered/read ticks (AutoTM has watermarks). |
| AR-37-004 | Conversation menu | Bottom sheet: mute notifications, report, block, delete conversation | Four actions |  | "Отключить уведомления", "Пожаловаться", "Заблокировать", "Удалить диалог" | Adopt: mute, report, block in the thread menu. Report and block matter for Google Play UGC review. |
| AR-37-005 | Messages list | Messages tab: support chat card with badge; one Conversation row with listing thumb, seller, title, price, preview, time, tick; tab badge | Support card, rows, tab badge | Row opens thread | "Сообщения", "Чат с поддержкой" | Adopt: row shows listing thumb + title + price + last message + time. Avoid: support chat unless AutoTM staffs it. |
| AR-38-001 | Messages, empty | Empty state illustration "Chatting is easy, open a listing to write to the seller" | Support card |  | "Общаться, легко" | Adopt: empty state that tells the buyer where Conversations start. |
| AR-38-002 | Messages list | Duplicate of AR-37-005 |  |  |  | Duplicate of AR-37-005. |

### Kolesa

| ID | Screen | Visible state | Key controls | Transition | Important text | AutoTM: adopt / avoid |
|---|---|---|---|---|---|---|
| KZ-11-001 | Listing detail (chat entry) | Duplicate of KZ-07-002 | Write button | Write opens thread |  | Duplicate of KZ-07-002. |
| KZ-11-002 | New Conversation | Thread header seller name, offline status, call, more; pinned listing strip; yellow prepayment warning; card "Seller rarely replies, better call" with Call; listing reply-context above composer | Call, more, listing strip, attach, camera, mic, input |  | "Никогда не отправляйте предоплату", "Продавец редко отвечает на сообщения  to  лучше позвонить" | Adopt: pinned listing strip and a one-line prepayment warning in new Conversations. Consider: response-rate hint later (needs data). |
| KZ-11-003 | Conversation, composing | Keyboard open, empty composer | Composer |  | "Написать сообщение" | Same as KZ-11-002. |
| KZ-11-004 | Conversation, typed message | Message typed, send enabled | Send |  | "Здравствуйте! Пожалуйста подскажите" | Send button becomes active only with text. |
| KZ-49-001 | Home (Messages entry frame) | Duplicate of KZ-01-001 |  | Tap Messages tab |  | Duplicate of KZ-01-001. |
| KZ-49-002 | Messages list | Messages tab: verified Kolesa system chat with unread badge; grocery ad below; "Select" action | Rows, Select | Row opens thread | "Сообщения", "Выбрать" | Adopt: pinned verified system channel for safety notices only if AutoTM needs it. Avoid: ads in the Conversation list. |
| KZ-49-003 | System safety message | Kolesa verified thread warning about prepayment scams | Read-only thread |  | "На Kolesa.kz сейчас нет возможности получить предоплату!" | Adopt: anti-fraud copy ("never prepay, never share card details") in Conversations; a strong trust pattern for TM. |
