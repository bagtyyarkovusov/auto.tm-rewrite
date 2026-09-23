import type { Locale } from "@/i18n/locales";

export interface LegalSection {
  title: string;
  body: string;
}

export interface LegalDocument {
  title: string;
  effectiveDate: string;
  effectiveDateISO: string;
  lastRevised: string;
  lastRevisedISO: string;
  sections: LegalSection[];
}

export const privacyPolicy: Record<Locale, LegalDocument> = {
  en: {
    title: "Privacy Policy",
    effectiveDate: "September 23, 2026",
    effectiveDateISO: "2026-09-23",
    lastRevised: "September 23, 2026",
    lastRevisedISO: "2026-09-23",
    sections: [
      {
        title: "1. What we collect",
        body: `We collect the following information when you use AutoTM:

- **Phone number** — used to create or sign in to your account with a code sent by SMS.
- **Email address** — collected when you choose to sign in by email, or when you add or change an email address on your account.
- **Listing contact phone** — the +993 number you choose to show on a listing. It is always a number confirmed by an SMS code.
- **Name and profile photo** — if you choose to add them to your profile.
- **Location** — the region and city you select for your listings or search preferences. We do **not** track your real-time GPS location.
- **Listings** — vehicle details, photos, price, and description of cars you post.
- **Messages** — text content of contact-thread conversations between buyers and sellers.
- **Device information** — device model, operating system, and app version, collected for debugging purposes.
- **IP address** — used for rate limiting and security.
- **Photo uploads** — images you attach to listings.
- **VIN** — if you voluntarily enter it.

Future collections (if features ship): push notification tokens, video uploads, garage vehicle data, blog content, inspection report data.`,
      },
      {
        title: "2. What we do NOT collect",
        body: `- We do **not** track your GPS location in the MLP beta.
- We do **not** store raw GPS coordinates.
- We do **not** use third-party advertising SDKs.
- We do **not** add open tracking, tracking pixels, or tracked links to the emails we send you.
- We do **not** sell your data to anyone.`,
      },
      {
        title: "3. Why we collect it",
        body: "We use your data to: create and maintain your account, display listings, enable search functionality, facilitate communication between users, prevent fraud, and comply with app store policies.",
      },
      {
        title: "4. Who can see it",
        body: `- **Public:** your display name and avatar (if shown), active listings, public listing photos, the city/region of listings, and the contact phone you chose for a listing.
- **Private:** the phone number and email address you use to sign in (unless you also choose that phone number as the contact phone of a listing), contact-thread message content (except for admin moderation), and exact location pin (if a future phase adds map features).`,
      },
      {
        title: "5. Sharing with third parties",
        body: "In the MLP beta, AutoTM uses its own authentication and hosting infrastructure. Sign-in codes sent by email are delivered by an email delivery provider located in the United States: it receives your email address and the message containing the code, and keeps them for 30 days. If native push notifications ship later, Firebase Cloud Messaging (Google) and Apple Push Notification Service will receive your device token and notification payload. We do not share data with advertisers, data brokers, or other third parties.",
      },
      {
        title: "6. Data retention & account deletion",
        body: `Your data is retained while your account is active.

You can request account deletion in two ways: in the app, or on the account deletion page on our website. Either way, you confirm the request with a code sent to the phone number or the email address on the account.

When you request account deletion:
- Your account enters a **30-day grace period**.
- During this period, your listings are archived, all sessions are revoked, and your phone number and email address remain reserved to you.
- You may recover your account at any time during the grace period by signing in again with either your phone number or your email address. Recovery reactivates your account and republishes archived listings.
- After 30 days, your personal information is removed: your phone number and email address are freed, display name and avatar are cleared.
- Your listings, messages, and conversation history are retained with "Deleted user" attribution to preserve counterparties' records and audit trails.
- Moderation reports and audit logs remain intact.`,
      },
      {
        title: "7. Your rights",
        body: "You have the right to: access your data, delete your account (in the app or on our website, with the 30-day grace period described above), correct your profile and listing information, and opt out of marketing notifications if we ever introduce them.",
      },
      {
        title: "8. Children's privacy",
        body: "AutoTM is not intended for users under 18 years of age (consistent with vehicle purchase being an adult activity). We do not knowingly collect data from minors.",
      },
      {
        title: "9. Cookies",
        body: "The web admin interface at apps/admin uses HTTP-only session cookies for login. The API accepts bearer token authentication. No analytics cookies are used in the MLP beta.",
      },
      {
        title: "10. Security",
        body: "We use HTTPS for all data in transit. Refresh tokens are hashed with bcrypt. Data is stored on encrypted disks. Servers are hosted in Turkmenistan. Admin actions are audit-logged.",
      },
      {
        title: "11. Changes to this policy",
        body: "We may update this Privacy Policy. Material changes will be communicated via the app or through our documented beta support channel. The effective date is displayed at the top of this document.",
      },
      {
        title: "12. Contact & jurisdiction",
        body: "For privacy inquiries, contact us at: privacy@auto.tm\n\nThis Privacy Policy is governed by the laws of Turkmenistan.",
      },
    ],
  },
  ru: {
    title: "Политика конфиденциальности",
    effectiveDate: "23 сентября 2026 г.",
    effectiveDateISO: "2026-09-23",
    lastRevised: "23 сентября 2026 г.",
    lastRevisedISO: "2026-09-23",
    sections: [
      {
        title: "1. Какие данные мы собираем",
        body: `- **Номер телефона** — для создания аккаунта или входа по коду из SMS.
- **Адрес электронной почты** — если вы выбираете вход по почте либо добавляете или меняете почту в аккаунте.
- **Контактный телефон объявления** — номер +993, который вы показываете в объявлении. Это всегда номер, подтверждённый кодом из SMS.
- **Имя и фото профиля** — если вы их добавите.
- **Местоположение** — регион и город, выбранные для объявлений или поиска. Мы **не** отслеживаем GPS в реальном времени.
- **Объявления** — данные автомобиля, фото, цена, описание.
- **Сообщения** — текст переписки между покупателями и продавцами.
- **Информация об устройстве** — модель, ОС, версия приложения (для отладки).
- **IP-адрес** — для ограничения частоты запросов и безопасности.
- **Загруженные фото** — изображения к объявлениям.
- **VIN** — если вы его введёте добровольно.`,
      },
      {
        title: "2. Что мы НЕ собираем",
        body: `- Мы **не** отслеживаем GPS-локацию.
- Мы **не** храним сырые GPS-координаты.
- Мы **не** используем сторонние рекламные SDK.
- Мы **не** добавляем в наши письма отслеживание открытий, трекинговые пиксели и отслеживаемые ссылки.
- Мы **не** продаём данные.`,
      },
      {
        title: "3. Зачем мы собираем данные",
        body: "Для создания аккаунта, отображения объявлений, поиска, коммуникации между пользователями, предотвращения мошенничества и соблюдения правил магазинов приложений.",
      },
      {
        title: "4. Кто может видеть данные",
        body: `- **Публично:** имя, аватар (если включены), активные объявления, фото, город/регион объявления и контактный телефон, выбранный для объявления.
- **Приватно:** номер телефона и адрес почты, по которым вы входите (если вы не выбрали этот номер контактным телефоном объявления), содержание переписки (кроме модерации), точная точка на карте (если добавим позже).`,
      },
      {
        title: "5. Передача третьим лицам",
        body: "В MLP-бете используется собственная инфраструктура. Письма с кодами входа отправляет сторонний почтовый сервис, расположенный в США: он получает ваш адрес почты и письмо с кодом, а также хранит их 30 дней. Если добавим push-уведомления, токены устройств будут передаваться FCM (Google) и APNS (Apple). Мы не передаём данные рекламным сетям или брокерам.",
      },
      {
        title: "6. Хранение данных и удаление аккаунта",
        body: `Данные хранятся, пока аккаунт активен.

Удаление аккаунта можно запросить двумя способами: в приложении или на странице удаления аккаунта на нашем сайте. В обоих случаях запрос подтверждается кодом, отправленным на номер телефона или адрес почты, указанные в аккаунте.

При удалении аккаунта:
- Аккаунт переходит в **30-дневный льготный период**.
- В этот период объявления архивируются, все сессии завершаются, номер телефона и адрес почты остаются зарезервированными за вами.
- Вы можете восстановить аккаунт в любой момент, войдя снова по номеру телефона или по адресу почты. Восстановление активирует аккаунт и возвращает архивные объявления.
- Через 30 дней персональные данные удаляются: номер телефона и адрес почты освобождаются, имя и аватар очищаются.
- Объявления, сообщения и переписка сохраняются с пометкой «Удалённый пользователь» — чтобы сохранить историю для собеседников и аудита.
- Жалобы и журналы аудита остаются нетронутыми.`,
      },
      {
        title: "7. Ваши права",
        body: "Право на доступ к данным, удаление аккаунта (в приложении или на сайте, с 30-дневным льготным периодом), исправление профиля/объявлений, отказ от маркетинговых уведомлений.",
      },
      {
        title: "8. Дети",
        body: "Приложение предназначено для лиц старше 18 лет. Мы сознательно не собираем данные несовершеннолетних.",
      },
      {
        title: "9. Файлы cookie",
        body: "Веб-админка использует HTTP-only session cookies. API работает с bearer-токенами. Аналитические cookies не используются.",
      },
      {
        title: "10. Безопасность",
        body: "HTTPS в transit. Токены обновления хешируются bcrypt. Диски зашифрованы. Серверы в Туркменистане. Действия администраторов логируются.",
      },
      {
        title: "11. Изменения политики",
        body: "Материальные изменения будут сообщены через приложение или канал поддержки бета. Дата вступления в силу указана вверху.",
      },
      {
        title: "12. Контакты и юрисдикция",
        body: "privacy@auto.tm. Законодательство Туркменистана.",
      },
    ],
  },
  tk: {
    title: "Gizlinlik syýasaty",
    effectiveDate: "23-nji sentýabr 2026",
    effectiveDateISO: "2026-09-23",
    lastRevised: "23-nji sentýabr 2026",
    lastRevisedISO: "2026-09-23",
    sections: [
      {
        title: "1. Haýsy maglumatlary ýygnaýarys",
        body: `- **Telefon belgisi** — SMS arkaly gelen kod bilen akkaunt döretmek ýa-da girmek üçin.
- **E-poçta salgysy** — e-poçta arkaly girmegi saýlasaňyz ýa-da akkauntyňyza e-poçta goşsaňyz ýa-da çalyşsaňyz.
- **Bildirişiň habarlaşma belgisi** — bildirişde görkezmek üçin saýlan +993 belgiňiz. Ol hemişe SMS kody bilen tassyklanan belgidir.
- **Ady we profil suraty** — goşsaňyz.
- **Ýerleşýän ýeri** — saýlanan sebit we şäher. GPS-y **gözegçilik etmeyäris**.
- **Bildirişler** — awtoulag maglumatlary, suratlar, baha, düşündiriş.
- **Habarlar** — satyn alyjy bilen satyjynyň arasyndaky çat.
- **Enjama maglumat** — model, OS, programmanyň wersiýasy (ýalňyşlary düzetmek üçin).
- **IP salgysy** — howpsuzlyk we çäklendirme.
- **Ýüklenen suratlar** — bildirişlere goşulan.
- **VIN** — öziňiz girizen bolsaňyz.`,
      },
      {
        title: "2. Haýsy maglumatlary ÝIGNAMAýARYS",
        body: `- GPS-y gözegçilik etmeyäris.
- GPS koordinatalaryny saklamaýarys.
- Üçünji tarap reklama SDK-laryny ulanmaýarys.
- Size iberýän hatlarymyza açylma yzarlaýşyny, yzarlaýjy piksel ýa-da yzarlanýan salgy goşmaýarys.
- Maglumatlary satmaýarys.`,
      },
      {
        title: "3. Näme üçin ýygnaýarys",
        body: "Akkaunt döretmek, bildirişleri görkezmek, gözleg, ulanyjylar arasynda habarlaşmak, aldamçylygy öňlemek we app store düzgünlerine laýyklyk.",
      },
      {
        title: "4. Kim görüp biler",
        body: `- **Jemgyýetçilik:** ady, awatar (açyk bolsa), işjeň bildirişler, suratlar, şäher/sebit we bildiriş üçin saýlanan habarlaşma belgisi.
- **Şahsy:** girmek üçin ulanýan telefon belgiňiz we e-poçta salgyňyz (şol telefon belgisini bildirişiň habarlaşma belgisi edip saýlamadyk bolsaňyz), çat habarlary (moderasiýadan başga), takyk ýer (soňrak goşulsa).`,
      },
      {
        title: "5. Üçünji taraplara geçirmek",
        body: "MLP betada öz infrastrukturamyz. E-poçta arkaly iberilýän giriş kodlaryny ABŞ-da ýerleşýän e-poçta eltiş üpjünçisi eltýär: ol siziň e-poçta salgyňyzy we kod ýazylan haty alýar we olary 30 gün saklaýar. Push habarlary goşulsa, enjam tokenlary FCM (Google) we APNS (Apple) gidýär. Reklama torlaryna ýa-da brokerlere maglumat geçirmeýäris.",
      },
      {
        title: "6. Maglumatlary saklamak we akkaunty pozmak",
        body: `Maglumatlar akkaunt işjeň bolança saklanýar.

Akkaunty pozmagy iki ýol bilen sorap bilersiňiz: programmada ýa-da saýtymyzdaky akkaunt pozmak sahypasynda. Iki ýagdaýda-da haýyş akkauntdaky telefon belgä ýa-da e-poçta salga iberilen kod bilen tassyklanýar.

Akkaunty pozan wagtyňyz:
- **30 günlük lýgotly döwr** başlaýar.
- Bu döwürde bildirişler arhiwlenýär, ähli sessiýalar gutarýar, telefon belgiňiz we e-poçta salgyňyz size bellenen galýar.
- Bu döwürde islän wagtyňyz telefon belgiňiz ýa-da e-poçta salgyňyz bilen gaýtadan girip, akkaunty dikeldip bilersiňiz. Dikeltme işjeň edýär we arhiwlenen bildirişleri yzyna getirýär.
- 30 günden soň şahsy maglumatlar aýrylýar: telefon belgisi we e-poçta salgysy boşadylýar, ady we awatar arassalanýar.
- Bildirişler, habarlar we çat taryhy «Pozulan ulanyjy» diýip saklanýar — tarapyňyz üçin ýazgylary we audit ýollaryny goraşmak üçin.
- Şikaýatlar we audit gündelikleri galyberýär.`,
      },
      {
        title: "7. Siziň hukuklaryňyz",
        body: "Maglumatlara giriş, akkaunty pozmak (programmada ýa-da saýtda, 30 günlük lýgotly döwür bilen), profil/bildirişleri düzetmek, marketing habarlamalaryndan çykmak.",
      },
      {
        title: "8. Çagalar",
        body: "Programma 18 ýaşdan ulylar üçin. Biz çagalardan maglumat ýygnamaýarys.",
      },
      {
        title: "9. Kukiler",
        body: "Web adminde HTTP-only session kukileri. API bearer token kabul edýär. Analitika kukileri ýok.",
      },
      {
        title: "10. Howpsuzlyk",
        body: "HTTPS transitde. Täzeleme tokenlary bcrypt bilen heşlenýär. Diskler şifrlenen. Serwerler Türkmenistanda. Admin hereketleri auditlenýär.",
      },
      {
        title: "11. Syýasat üýtgemeleri",
        body: "Esasy üýtgeşmeler programma ýa-da beta goldaw arkaly duýdurylar. Güýje giriş senesi ýokarda görkezilendir.",
      },
      {
        title: "12. Habarlaşmak we yurisdiksiýa",
        body: "privacy@auto.tm. Türkmenistanyň kanunlary.",
      },
    ],
  },
};

export const termsOfService: Record<Locale, LegalDocument> = {
  en: {
    title: "Terms of Service",
    effectiveDate: "September 23, 2026",
    effectiveDateISO: "2026-09-23",
    lastRevised: "September 23, 2026",
    lastRevisedISO: "2026-09-23",
    sections: [
      {
        title: "1. Eligibility",
        body: "You must be at least 18 years old to use AutoTM. By using the app, you agree to abide by these Terms of Service.",
      },
      {
        title: "2. Account responsibilities",
        body: `You sign in with a code sent to your phone number or to your email address; AutoTM does not use passwords. Your account always keeps at least one of these sign-in methods, and you are responsible for maintaining access to them and for keeping your codes to yourself. AutoTM will never ask you to share a code.

You are responsible for all content you post on AutoTM.`,
      },
      {
        title: "3. Acceptable use",
        body: "Listings must be for real vehicles you own or are authorized to represent. You may not use AutoTM for scams, fraud, harassment, illegal content, or intellectual property infringement.",
      },
      {
        title: "4. Listing accuracy and contact phone",
        body: `Sellers represent that their listings are accurate. Misrepresentation may result in account suspension or listing removal.

Every listing shows a contact phone that has been verified. Before you publish or republish a listing, or change its contact phone, that number must be verified: it is either the verified phone number on your account, or another +993 number you confirm with a code sent to it by SMS for this purpose. Confirming a number only allows it to be shown on your listing; it does not make that number a way to sign in to your account. If your account has no phone number, you do not need to add one — you verify a contact phone while creating the listing. Use only a number you are entitled to use: if it belongs to someone else, that person must agree to be contacted about the listing.`,
      },
      {
        title: "5. Prohibited content",
        body: "You may not post: spam, duplicate listings, stolen vehicles, vehicles with active liens (without disclosure), or illegally modified vehicles.",
      },
      {
        title: "6. Communication",
        body: "You agree to receive transactional messages necessary to operate the service: sign-in codes sent by SMS or email, codes that confirm a listing contact phone, and contact-thread messages. Push notifications and marketing communications require separate opt-in if introduced.",
      },
      {
        title: "7. Disclaimer",
        body: "AutoTM is a marketplace platform. We do not own, inspect, or warrant the vehicles listed (except where Phase 2 inspection reports explicitly apply). All transactions are solely between users.",
      },
      {
        title: "8. Inspection reports (Phase 2)",
        body: "If available, inspection reports represent AutoTM's good-faith assessment. They are not a warranty. Buyers should perform independent verification.",
      },
      {
        title: "9. Dealer terms",
        body: "Dealer accounts, PRO badges, and dealership verification are post-MLP features. If introduced, dealers are responsible for the accuracy of all listings under their account.",
      },
      {
        title: "10. Termination & account deletion",
        body: `You may delete your account at any time through the in-app settings, or by requesting deletion on our website with the phone number or email address on your account. Deletion initiates a 30-day grace period during which you may recover your account by signing in again with either your phone number or your email address. After 30 days, your personal data is removed, but your listings and messages are retained with anonymized attribution.

AutoTM may suspend accounts that violate these terms.`,
      },
      {
        title: "11. Liability",
        body: "AutoTM is not liable for disputes, transactions, or content between users, to the extent permitted by law.",
      },
      {
        title: "12. Modifications",
        body: "We may update these terms. Material changes will be communicated in-app or through the documented beta support channel.",
      },
      {
        title: "13. Governing law & contact",
        body: "These Terms are governed by the laws of Turkmenistan.\n\nFor inquiries: legal@auto.tm",
      },
    ],
  },
  ru: {
    title: "Условия использования",
    effectiveDate: "23 сентября 2026 г.",
    effectiveDateISO: "2026-09-23",
    lastRevised: "23 сентября 2026 г.",
    lastRevisedISO: "2026-09-23",
    sections: [
      {
        title: "1. Допустимый возраст",
        body: "Вам должно быть не менее 18 лет. Используя приложение, вы соглашаетесь с настоящими Условиями.",
      },
      {
        title: "2. Ответственность за аккаунт",
        body: `Вход выполняется по коду, который приходит на ваш номер телефона или на адрес электронной почты; паролей в AutoTM нет. В аккаунте всегда остаётся хотя бы один такой способ входа: вы отвечаете за доступ к нему и за то, чтобы не передавать коды посторонним. AutoTM никогда не просит сообщить код.

Вы несёте ответственность за весь контент, который публикуете.`,
      },
      {
        title: "3. Допустимое использование",
        body: "Объявления должны быть о реальных автомобилях, которыми вы владеете или имеете право представлять. Запрещены мошенничество, спам, домогательства, незаконный контент, нарушение интеллектуальной собственности.",
      },
      {
        title: "4. Точность объявлений и контактный телефон",
        body: `Продавец гарантирует достоверность информации. Недостоверные сведения могут привести к блокировке.

В каждом объявлении показывается подтверждённый контактный телефон. Прежде чем вы опубликуете или переопубликуете объявление либо измените его контактный телефон, этот номер должен быть подтверждён: это либо подтверждённый номер телефона вашего аккаунта, либо другой номер +993, который вы подтверждаете кодом, отправленным на него по SMS для этой цели. Подтверждение разрешает только показывать номер в вашем объявлении; оно не делает этот номер способом входа в аккаунт. Если в аккаунте нет номера телефона, добавлять его не нужно — контактный телефон подтверждается при создании объявления. Указывайте только тот номер, которым вы вправе пользоваться: если он принадлежит другому человеку, этот человек должен согласиться на обращения по объявлению.`,
      },
      {
        title: "5. Запрещённый контент",
        body: "Спам, дублирующие объявления, угнанные автомобили, автомобили с обременениями (без указания), незаконные доработки.",
      },
      {
        title: "6. Коммуникации",
        body: "Вы соглашаетесь получать транзакционные сообщения, необходимые для работы сервиса: коды входа по SMS или электронной почте, коды подтверждения контактного телефона объявления и переписку. Push-уведомления и маркетинг — отдельное согласие.",
      },
      {
        title: "7. Ограничение ответственности",
        body: "AutoTM — площадка. Мы не владеем, не проверяем и не гарантируем автомобили (кроме случаев с отчётами осмотра Фазы 2). Сделки — между пользователями.",
      },
      {
        title: "8. Отчёты осмотра (Фаза 2)",
        body: "Если доступны, это оценка добросовестности. Не гарантия. Покупатель должен проверить самостоятельно.",
      },
      {
        title: "9. Условия для дилеров",
        body: "Дилерские аккаунты — после MLP. Дилеры отвечают за точность всех своих объявлений.",
      },
      {
        title: "10. Расторжение и удаление аккаунта",
        body: `Вы можете удалить аккаунт в настройках приложения или запросить удаление на нашем сайте, указав номер телефона или адрес почты из аккаунта. Удаление запускает 30-дневный льготный период, в течение которого аккаунт можно восстановить, войдя снова по номеру телефона или по адресу почты. Через 30 дней персональные данные удаляются, объявления и переписка сохраняются с анонимной атрибуцией.

AutoTM может приостановить аккаунт за нарушения.`,
      },
      {
        title: "11. Ответственность",
        body: "AutoTM не несёт ответственности за споры и сделки между пользователями в пределах, допустимых законом.",
      },
      {
        title: "12. Изменения условий",
        body: "Мы можем обновлять условия. Материальные изменения сообщаются через приложение.",
      },
      {
        title: "13. Право и контакты",
        body: "Законодательство Туркменистана. legal@auto.tm",
      },
    ],
  },
  tk: {
    title: "Ulanyş şertleri",
    effectiveDate: "23-nji sentýabr 2026",
    effectiveDateISO: "2026-09-23",
    lastRevised: "23-nji sentýabr 2026",
    lastRevisedISO: "2026-09-23",
    sections: [
      {
        title: "1. Ýaş çägi",
        body: "Iň az 18 ýaş. Programmany ulanmak bilen şertleri kabul edýärsiňiz.",
      },
      {
        title: "2. Akkaunt jogapkärçiligi",
        body: `Siz parol bilen däl-de, telefon belgiňize ýa-da e-poçta salgyňyza iberilen kod bilen girýärsiňiz. Akkauntyňyzda şeýle giriş usullarynyň iň azyndan biri hemişe galýar: oňa elýeterliligi saklamak we kody başga hiç kime bermezlik siziň jogapkärçiligiňiz. AutoTM hiç haçan kody paýlaşmagy soramaýar.

Ýazan ähli kontentiňize siz jogapkär.`,
      },
      {
        title: "3. Kabul edilýan ulanyş",
        body: "Bildirişler siziň özüňize degişli ýa-da wakalaşyk berlen hakyky awtoular hakda bolmaly. Aldamçylyk, spam, garsylyk, näkanuny kontent gadagan.",
      },
      {
        title: "4. Bildirişleriň dogrulygy we habarlaşma belgisi",
        body: `Satyjy maglumatlaryň dogrulygyny kepillendirýär. Ýalňyş maglumat akkaunty bloklamaga getirip biler.

Her bildirişde tassyklanan habarlaşma belgisi görkezilýär. Bildirişi çap etmezden, gaýtadan çap etmezden ýa-da onuň habarlaşma belgisini çalyşmazdan öň şol belgi tassyklanmaly: ol ýa akkauntyňyzdaky tassyklanan telefon belgiňizdir, ýa-da şu maksat bilen SMS arkaly iberilen kod bilen tassyklaýan başga bir +993 belgiňizdir. Belgini tassyklamak diňe ony bildirişiňizde görkezmäge rugsat berýär; ol belgi akkaunta girmegiň usulyna öwrülmeýär. Akkauntyňyzda telefon belgisi ýok bolsa, goşmak hökman däl — habarlaşma belgisini bildirişi döredeniňizde tassyklaýarsyňyz. Diňe ulanmaga hakyňyz bolan belgini görkeziň: belgi başga bir adama degişli bolsa, ol adam bildiriş boýunça habarlaşylmagyna razy bolmaly.`,
      },
      {
        title: "5. Gadagan kontent",
        body: "Spam, dublikat bildirişler, ogurlanan maşynlar, girewjisi bolan maşynlar (körkezilmese), näkanuny üýtgeşmeler.",
      },
      {
        title: "6. Habarlaşma",
        body: "Siz hyzmaty işletmek üçin zerur transaksion habarlary almagy kabul edýärsiňiz: SMS ýa-da e-poçta arkaly gelýän giriş kodlary, bildirişiň habarlaşma belgisini tassyklaýan kodlar we çat habarlary. Push we marketing — aýratyn razylyk.",
      },
      {
        title: "7. Jogapkärçiliginiň çäklendirilmesi",
        body: "AutoTM — bazar meýdany. Maşynlary eýelemeýäris, barlamayarys, kepillendirmeýäris (2-nji tapgyr barlag hasabatlaryndan başga). Söwda — ulanyjylaryň arasynda.",
      },
      {
        title: "8. Barlag hasabatlary (2-nji tapgyr)",
        body: "Elýeter bolsa, dogry pikirli bahalama. Kepillik däl. Satyn alyjy öz başdan barlamaly.",
      },
      {
        title: "9. Dilowçilik şertleri",
        body: "Dilowçy akkauntlary — MLP-den soň. Dilowçylar ähli bildirişleriň dogrulygyna jogapkär.",
      },
      {
        title: "10. Yzyna çykma we akkaunty pozmak",
        body: `Akkaunty programmanyň sazlamalaryndan pozup bilersiňiz ýa-da saýtymyzda akkauntyňyzdaky telefon belgisi ýa-da e-poçta salgysy bilen pozmagy sorap bilersiňiz. Pozmak 30 günlük lýgotly döwür başlaýar; şol döwürde telefon belgiňiz ýa-da e-poçta salgyňyz bilen gaýtadan girip, akkaunty dikeldip bolýar. 30 günden soň şahsy maglumatlar aýrylýar, bildirişler we çat anonim atanama saklanýar.

AutoTM düzgünleri bozýan akkaunty bloklap biler.`,
      },
      {
        title: "11. Jogapkärçilik",
        body: "Kanuna laýyklykda, ulanyjylar arasyndaky çekişmeler we söwdalar üçin AutoTM jogapkär däl.",
      },
      {
        title: "12. Şertleriň üýtgemeleri",
        body: "Esasy üýtgeşmeler programma arkaly duýdurylar.",
      },
      {
        title: "13. Kanun we habarlaşmak",
        body: "Türkmenistanyň kanunlary. legal@auto.tm",
      },
    ],
  },
};
