import { getStore } from "@netlify/blobs";

// Runtime source of truth is a single JSON document stored in Netlify Blobs.
// The static JSON file in /site/data/offers.json is a deployment fallback / seed.
const DEFAULT_OFFERS = [
  {"id":"vtb-start","name":"ВТБ","tariff":"На старте","price":"от 0 ₽/мес.","description":"Для нового бизнеса: бесплатное открытие счета, первые месяцы без платы за пакет и базовый набор платежей.","details":"Подходит ИП и ООО. Перед оформлением проверьте актуальные лимиты и стоимость операций на сайте банка. Для партнерского РегБизнес-оффера ВТБ отдельно требуется регистрация бизнеса, открытие РКО и выпуск корпоративной карты.","types":["ИП","ООО"],"link":"","image":"/assets/vtb.svg","partner":"RKO-partner","admin_note":"РегБизнес: 13 000 ₽. ЦД: регистрация + РКО + корпоративная карта.","sort":10,"active":true,"price_mode":"zero","search_tags":["регбизнес","регистрация ип"]},
  {"id":"alfa-zero","name":"Альфа-Банк","tariff":"Ноль за обслуживание","price":"от 0 ₽/мес.","description":"Счет для начинающего или сезонного бизнеса с бесплатным обслуживанием при выполнении условий тарифа.","details":"Тариф подходит ИП и ООО. Стоимость отдельных переводов и лимиты зависят от актуальной редакции тарифа. Условия банка могут меняться, поэтому перед заявкой стоит открыть полное описание.","types":["ИП","ООО"],"link":"","image":"/assets/alfa.svg","partner":"RKO-partner","admin_note":"РКО свежего бизнеса до 30 дней: 14 000 ₽ по переданным условиям ПП.","sort":20,"active":true,"price_mode":"zero","search_tags":["альфа бизнес","рко"]},
  {"id":"ubrr-vzletai","name":"УБРиР","tariff":"Взлетай!","price":"от 0 ₽","description":"Стартовый пакет для небольшого бизнеса. В промо-период обслуживание может быть бесплатным.","details":"Подходит для старта и небольшого числа операций. По переданному CPA-офферу активация требует расходную операцию от 5 000 ₽ в месяц открытия. Если выбран платный тариф, его нужно оплатить в месяц открытия.","types":["ИП","ООО"],"link":"","image":"/assets/ubrr.svg","partner":"FCN / RKO-partner","admin_note":"3 000 ₽ за открытие на Промо/Промолайт/Взлетай/Твой выбор + 4 500 ₽ активация.","sort":30,"active":true,"price_mode":"zero","search_tags":["убрир","взлетай"]},
  {"id":"uralsib-start","name":"Уралсиб","tariff":"Стартовый","price":"от 0 ₽/мес.","description":"Тариф для начинающего бизнеса с бесплатным периодом обслуживания и базовыми платежами.","details":"Подходит ИП и ООО. В партнерском CPA-оффере активация: минимум 3 исходящие операции суммарно от 15 000 ₽ за 60 дней. Клиент должен быть новым для банка.","types":["ИП","ООО"],"link":"","image":"/assets/uralsib.svg","partner":"RKO-partner","admin_note":"ИП Старт: 6 000 ₽; ООО Старт: 6 500 ₽.","sort":40,"active":true,"price_mode":"zero","search_tags":["уралсиб","старт"]},
  {"id":"loko-drive","name":"Локо-Банк","tariff":"Драйв","price":"от 0 ₽/мес.","description":"Базовый расчетный счет для небольшого бизнеса с доступным обслуживанием и онлайн-операциями.","details":"По переданному партнерскому офферу для ИП активация требует минимум 3 учитываемые операции на общую сумму от 30 000 ₽ за 90 дней. Технические переводы и ряд операций не учитываются.","types":["ИП","ООО"],"link":"","image":"/assets/loko.svg","partner":"RKO-partner","admin_note":"ИП: 8 500 ₽ за открытие + активацию.","sort":50,"active":true,"price_mode":"zero","search_tags":["локо","драйв"]},
  {"id":"psb-mini","name":"ПСБ","tariff":"Мини","price":"от 690 ₽/мес.","description":"Платный тариф для небольшого бизнеса с включенными платежами и дистанционным обслуживанием.","details":"По офферу FCN целевое действие: открытие расчетного счета на платном тарифе. Свежий бизнес допускается, но может проходить более пристальную проверку. ОКВЭД 73.11 не принимается.","types":["ИП","ООО"],"link":"","image":"/assets/psb.svg","partner":"FCN","admin_note":"10 000 ₽. GEO РФ кроме Крыма и новых регионов.","sort":60,"active":true,"price_mode":"paid","search_tags":["псб","промсвязьбанк","мини"]},
  {"id":"ozon-initial","name":"Ozon Банк","tariff":"Начальный","price":"от 0 ₽/мес.","description":"Базовый тариф для ИП и ООО с бесплатным обслуживанием и онлайн-управлением счетом.","details":"По переданному офферу оплачивается открытие счета новым клиентом ГК Ozon. Банк отдельно следит за качеством активности и может не оплачивать технические или однотипные операции.","types":["ИП","ООО"],"link":"","image":"/assets/ozon.svg","partner":"RKO-partner","admin_note":"8 000 ₽ за открытие новым клиентом ГК Ozon.","sort":70,"active":true,"price_mode":"zero","search_tags":["ozon","озон","начальный"]},
  {"id":"tochka-business","name":"Точка","tariff":"Для бизнеса","price":"от 0 ₽","description":"Онлайн-банк для предпринимателей и компаний с дистанционным открытием счета и сервисами для бизнеса.","details":"Стоимость зависит от выбранного пакета и профиля бизнеса. В переданном CPA-оффере не учитываются ИП на НПД и тариф Ноль, поэтому партнерские условия нужно проверять перед оформлением.","types":["ИП","ООО"],"link":"","image":"/assets/tochka.svg","partner":"RKO-partner","admin_note":"10 000 ₽ за открытие + активацию. Не оплачивается НПД и тариф Ноль.","sort":80,"active":true,"price_mode":"zero","search_tags":["точка","рко"]}
];

const normalizeDocument = (value) => {
  if (Array.isArray(value)) return { version: 1, updated_at: null, offers: value };
  if (value && typeof value === "object" && Array.isArray(value.offers)) return value;
  return { version: 1, updated_at: null, offers: DEFAULT_OFFERS };
};

export async function loadCardsDocument() {
  try {
    const store = getStore("rko-showcase");
    // New key. If it does not exist, transparently migrate the old `cards` array.
    const doc = await store.get("offers.json", { type: "json" });
    if (doc) return normalizeDocument(doc);
    const legacy = await store.get("cards", { type: "json" });
    return normalizeDocument(legacy);
  } catch {
    return { version: 1, updated_at: null, offers: DEFAULT_OFFERS };
  }
}

export async function loadCards() {
  return (await loadCardsDocument()).offers;
}

export async function saveCards(cards) {
  const store = getStore("rko-showcase");
  const doc = {
    version: 1,
    updated_at: new Date().toISOString(),
    offers: cards
  };
  await store.setJSON("offers.json", doc);
  return doc;
}

export { DEFAULT_OFFERS as DEFAULT_CARDS };
