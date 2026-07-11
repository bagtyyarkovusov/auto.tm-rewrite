import type { Locale } from "@/i18n/locales";

export interface TrustSection {
  icon: "shield" | "phone" | "clipboard" | "search" | "wrench" | "alert";
  title: string;
  body: string;
}

export interface TrustDocument {
  title: string;
  intro: string;
  sections: TrustSection[];
}

export const trustInfo: Record<Locale, TrustDocument> = {
  en: {
    title: "How AutoTM keeps you safe",
    intro:
      "AutoTM is built to make car buying in Turkmenistan more transparent. Here is what we already do, what is coming soon, and what we do not promise.",
    sections: [
      {
        icon: "phone",
        title: "Verified phone sellers",
        body: "Every seller account is tied to a real Turkmenistan phone number verified by SMS. This does not mean we vouch for the car, but it means there is a real person behind the listing.",
      },
      {
        icon: "clipboard",
        title: "Structured condition disclosure",
        body: "Sellers can answer standard questions about accidents, true mileage, number of owners, and service history. If a seller has not filled this out, we tell you honestly.",
      },
      {
        icon: "search",
        title: "Honest VIN history",
        body: "When a seller provides a VIN, we decode what we can and show it clearly. If the VIN is missing or cannot be decoded, we say so instead of hiding it.",
      },
      {
        icon: "wrench",
        title: "AutoTM inspections are coming",
        body: "We are running a small free pilot where an AutoTM mechanic inspects a car before you buy. Tapping 'Request AutoTM inspection' registers your interest; it does not book an inspection yet.",
      },
      {
        icon: "alert",
        title: "What we do not promise",
        body: "We do not inspect every listing. We do not offer buyer protection, warranty, escrow, insurance, or paid placement. Verified phones and condition disclosures help you decide, but you should still inspect the car yourself or with a trusted mechanic.",
      },
    ],
  },
  ru: {
    title: "Как AutoTM защищает покупателей",
    intro:
      "AutoTM создан, чтобы сделать покупку автомобиля в Туркменистане более прозрачной. Рассказываем, что уже работает, что скоро появится и чего мы не обещаем.",
    sections: [
      {
        icon: "phone",
        title: "Продавцы с подтверждённым телефоном",
        body: "Каждый аккаунт продавца привязан к реальному номеру телефона Туркменистана, подтверждённому по SMS. Это не означает, что мы ручаемся за машину, но за объявлением стоит реальный человек.",
      },
      {
        icon: "clipboard",
        title: "Структурированное раскрытие состояния",
        body: "Продавцы могут ответить на стандартные вопросы об авариях, достоверности пробега, количестве владельцев и сервисной истории. Если продавец не заполнил раздел, мы честно об этом пишем.",
      },
      {
        icon: "search",
        title: "Честная история по VIN",
        body: "Когда продавец указывает VIN, мы расшифровываем, что можем, и показываем прозрачно. Если VIN отсутствует или не удалось расшифровать, мы говорим об этом вместо того, чтобы скрывать.",
      },
      {
        icon: "wrench",
        title: "Проверки AutoTM скоро",
        body: "Мы запускаем небольшой бесплатный пилот: механик AutoTM осмотрит автомобиль перед покупкой. Нажатие 'Запросить проверку AutoTM' фиксирует ваш интерес, но пока не бронирует осмотр.",
      },
      {
        icon: "alert",
        title: "Чего мы не обещаем",
        body: "Мы не проверяем каждое объявление. Мы не предоставляем защиту покупателя, гарантию, эскроу, страховку или платное размещение. Подтверждённый телефон и данные о состоянии помогают принять решение, но машину всё равно нужно осмотреть лично или с доверенным механиком.",
      },
    ],
  },
  tk: {
    title: "AutoTM sizi nählet howpsuz saklaýar",
    intro:
      "AutoTM Türkmenistanda awtomobil satyn almagy has açyk etmek üçin düzüldi. Indi näme edýäris, näme ýakyn wagtda gelýär we näme söz bermeýäris.",
    sections: [
      {
        icon: "phone",
        title: "Tassyklanan telefon satyjylary",
        body: "Her satyjy akkaunty SMS bilen tassyklanan, Türkmenistandaky hakyky telefon belgisi bilen baglanşykly. Bu maşyny kepillendirýändigimiz däl, emma bildirişiň aýagyna hakyky adamdygyny aňladýar.",
      },
      {
        icon: "clipboard",
        title: "Gurluşykly ýagdaý maglumaty",
        body: "Satyjylar awariýa, dogry ýörelge, eýeleriň sany we hyzmat taryhy barada standart soraglara jogap biler. Satyjy bölümi doldurmadyk bolsa, çynsy aýdýarys.",
      },
      {
        icon: "search",
        title: "Dogry VIN taryhy",
        body: "Satyjy VIN görkezende, biz mümkin boldygyça düşündiriýäris we düşnükli görkezýäris. Eger VIN ýok ýa-da düşündirip bolmasa, gizlemezden aýdýarys.",
      },
      {
        icon: "wrench",
        title: "AutoTM barlaglary ýakyn wagtda",
        body: "Biz kiçi mugt pilot işleýäris: AutoTM mehanigi satyn almazdan ozal maşyny barlaýar. 'AutoTM barlagyny sora' düwmesine basmak siziň islegiňizi bellige alýar, ýöne heniz barlag bronlamaz.",
      },
      {
        icon: "alert",
        title: "Näme söz bermeýäris",
        body: "Biz her bildirişi barlamaýarys. Satyn alyjy goragy, kepillik, escrow, ygtybarlylyk ýa-da tölegli ýerleşdirme bermeyäris. Tassyklanan telefon we ýagdaý maglumatlary karar kabul etmäge kömek edýär, emma maşyny şahsy ýa-da ynamdar mehanik bilen barlamaly.",
      },
    ],
  },
};
