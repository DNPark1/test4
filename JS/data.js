/*
 * ДАННЫЕ САЙТА. Всё, что показано в таблице, на графиках и на карте, считается отсюда.
 * Источник REGIONS: YuFO_turizm_dannye.xlsx, листы «Данные» и «Расхождения» (сборка 26.10.2026).
 *
 * Значения оценок всегда в млн (человек или поездок, см. unit).
 * Разрыв и разброс НЕ вводятся вручную: их считает script.js.
 *
 * Роль оценки (role):
 *   'regional' — основная оценка региона; идёт в колонку «Оценка региона»
 *   'rosstat'  — федеральная оценка; идёт в колонку «Оценка Росстата»
 *   'alt'      — другая оценка того же показателя; участвует только в расчёте разброса
 *
 * Надёжность (reliability), как в файле:
 *   'A' — официальная статистика
 *   'B' — заявление должностных лиц, методика обычно не раскрыта
 *   'C' — СМИ, аналитика, операторы связи
 */
const REGIONS = [
  {
    id: 'krasnodar',
    name: 'Краснодарский край', short: 'Краснодарский',
    lat: 45.35, lng: 39.1, labelDir: 'top',
    period: '2025',
    note: 'Федеральная оценка почти вдвое ниже региональной. Однодневные посетители в региональную цифру не входят. Определения «турист» и «поездка» у региона и федерального центра различаются.',
    estimates: [
      { role: 'regional', value: 18.1, unit: 'млн чел.', who: 'Губернатор В. Кондратьев; минкурортов края', reliability: 'B', url: 'https://south.vedomosti.ru/south/news/2026/01/19/1170211-turpotok' },
      { role: 'rosstat', value: 9.3, unit: 'млн поездок', who: 'Минэкономразвития РФ (данные статистики)', reliability: 'A', url: 'https://mintrans.gov.ru/eye/press-center/branch-news/8834' },
      { role: 'alt', value: 18.43, unit: 'млн', who: 'TAdviser (сводный обзор)', reliability: 'C', url: 'https://www.tadviser.ru/index.php/%D0%A1%D1%82%D0%B0%D1%82%D1%8C%D1%8F:%D0%92%D0%BD%D1%83%D1%82%D1%80%D0%B5%D0%BD%D0%BD%D0%B8%D0%B9_%D1%82%D1%83%D1%80%D0%B8%D0%B7%D0%BC_%D0%B2_%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D0%B8' }
    ]
  },
  {
    id: 'crimea',
    name: 'Республика Крым', short: 'Крым',
    lat: 45.3, lng: 34.4, labelDir: 'top',
    period: '2025',
    note: 'Вице-премьер называет 7,4 млн, глава региона — 6,9 млн. Гипотеза, не подтверждённая источниками: 7,4 = Крым (6,9) + Севастополь (0,5). Федеральная оценка в 2,9–3,1 раза ниже: разные определения и охват.',
    estimates: [
      { role: 'regional', value: 6.9, unit: 'млн чел.', who: 'Глава Крыма С. Аксёнов (через ТАСС)', reliability: 'B', url: 'https://tass.ru/ekonomika/26136069' },
      { role: 'rosstat', value: 2.4, unit: 'млн поездок', who: 'Минэкономразвития РФ (данные статистики)', reliability: 'A', url: 'https://mintrans.gov.ru/eye/press-center/branch-news/8834' },
      { role: 'alt', value: 7.4, unit: 'млн чел.', who: 'Вице-премьер РФ М. Хуснуллин', reliability: 'B', url: 'https://www.vedomosti.ru/society/news/2026/03/18/1183829-turpotok-v-krim' }
    ]
  },
  {
    id: 'astrakhan',
    name: 'Астраханская область', short: 'Астрахань',
    lat: 46.8, lng: 47.6, labelDir: 'top',
    period: '2023',
    note: 'Единственная пара здесь за 2023 год, с 2025 годом напрямую не сравнивается. Росстат учитывает только коллективные средства размещения (КСР), регион — всех гостей. Значение Росстата восстановлено по инфографике, его нужно сверить с оригиналом.',
    estimates: [
      { role: 'regional', value: 1.37, unit: 'млн чел.', who: 'Члены общественного совета при думе (через АБН24)', reliability: 'B', url: 'https://abnews.ru/ug/news/astrakhan/2024/11/27/chleny-obshhestvennogo-soveta-pri-dume-astrahanskoj-oblasti-obsudili-razvitie-ekologicheskogo-turizma' },
      { role: 'rosstat', value: 0.378, unit: 'млн чел., только КСР', who: 'Астраханьстат (Росстат)', reliability: 'A', url: 'https://30.rosstat.gov.ru/storage/mediabank/Туризм%20АО%20(инфографика).pdf' }
    ]
  },
  {
    id: 'rostov',
    name: 'Ростовская область', short: 'Ростов',
    lat: 47.6, lng: 40.9, labelDir: 'top',
    period: '2025',
    note: 'Есть только федеральная оценка. Абсолютное значение региона в источнике не указано: министр называет лишь рост на 17% в 2026 году.',
    estimates: [
      { role: 'rosstat', value: 1.9, unit: 'млн поездок', who: 'Минэкономразвития РФ (данные статистики)', reliability: 'A', url: 'https://mintrans.gov.ru/eye/press-center/branch-news/8834' }
    ]
  },
  {
    id: 'volgograd',
    name: 'Волгоградская область', short: 'Волгоград',
    lat: 49.6, lng: 44.4, labelDir: 'top',
    period: '2025',
    note: 'Федеральной оценки в файле нет, обе цифры — пересказ СМИ. От выбора варианта зависит знак динамики к 2024 году (2,0 млн): либо −5%, либо +5%.',
    estimates: [
      { role: 'regional', value: 1.9, unit: 'млн чел.', who: '«Mail Фокус»', reliability: 'C', url: 'https://vfokuse.mail.ru/articles/69292646-chem-volgograd-privlekaet-inostrancev/' },
      { role: 'alt', value: 2.1, unit: 'млн чел.', who: '«Волгоградская правда» (через АБН24)', reliability: 'C', url: 'https://abnews.ru/ug/news/volgograd/2026/7/24/volgogradskaya-oblast-predstavila-turpotenczial-v-harbine-knr' }
    ]
  },
  {
    id: 'adygea',
    name: 'Республика Адыгея', short: 'Адыгея',
    lat: 44.75, lng: 40.2, labelDir: 'right',
    period: '2025',
    note: 'Федеральной абсолютной оценки в файле нет. Операторы связи за 10 месяцев насчитали больше, чем регион за год: считаются все прибывшие, а не туристы.',
    estimates: [
      { role: 'regional', value: 1.0, unit: 'млн чел.', who: 'Глава региона М. Кумпилов (по данным МТС)', reliability: 'B', url: 'https://runews24.ru/maykop/16/04/2026/adyigeya-vzyala-million-gornaya-respublika-obnovila-rekord-turpotoka-i-gotovitsya-k-letnemu-bumu' },
      { role: 'alt', value: 1.4, unit: 'млн чел., январь–октябрь', who: 'Операторы связи (через runews24)', reliability: 'C', url: 'https://runews24.ru/maykop/02/12/2025/murat-kumpilov-adyigeya-za-10-mesyaczev-2025-goda-prodemonstrirovala-rost-turpotoka-v-65-vyipolniv-zadachu-postavlennuyu-prezidentom' }
    ]
  },
  {
    id: 'sevastopol',
    name: 'Севастополь', short: 'Севастополь',
    lat: 44.6, lng: 33.55, labelDir: 'left',
    period: '2025',
    note: 'Федеральной абсолютной оценки в файле нет. Обе цифры исходят от самого региона. Экскурсанты считаются отдельно: около 5 млн, намного больше ночующих туристов.',
    estimates: [
      { role: 'regional', value: 0.42, unit: 'млн чел.', who: 'Правительство Севастополя (через «Профиль»)', reliability: 'B', url: 'https://profile.ru/news/society/v-2025-godu-sevastopol-posetili-bolee-420-tys-turistov-1802096/amp/' },
      { role: 'alt', value: 0.5, unit: 'млн чел.', who: 'Губернатор М. Развожаев (через Tourdom)', reliability: 'B', url: 'https://www.tourdom.ru/news/chislo-turistov-v-sevastopole-vyroslo-vdvoe-v-2025-godu.html' }
    ]
  },
  {
    id: 'kalmykia',
    name: 'Республика Калмыкия', short: 'Калмыкия',
    lat: 46.3, lng: 44.9, labelDir: 'top',
    period: '2025',
    note: 'Абсолютных значений найти не удалось. Известен только рост на 81,7% за январь–июнь 2025 по оценке Минэкономразвития.',
    estimates: []
  }
];

/*
 * ДЕМО-СЛОЙ ООПТ. В файле YuFO_turizm_dannye.xlsx данных об ООПТ нет.
 * Это примеры известных природных территорий с ПРИБЛИЗИТЕЛЬНЫМИ координатами центра,
 * а не юридические границы. Перед защитой замените их выгрузкой из кадастра ООПТ.
 *
 * severity: 'strict' — заповедник; 'partial' — национальный/природный парк, заказник.
 */
const OOPT = [
  { name: 'Кавказский заповедник', category: 'Заповедник', severity: 'strict', region: 'Краснодарский край, Адыгея', lat: 43.95, lng: 40.25 },
  { name: 'Сочинский национальный парк', category: 'Национальный парк', severity: 'partial', region: 'Краснодарский край', lat: 43.7, lng: 39.75 },
  { name: 'Заповедник «Утриш»', category: 'Заповедник', severity: 'strict', region: 'Краснодарский край', lat: 44.72, lng: 37.45 },
  { name: 'Крымский заповедник', category: 'Заповедник', severity: 'strict', region: 'Республика Крым', lat: 44.72, lng: 34.3 },
  { name: 'Карадагский заповедник', category: 'Заповедник', severity: 'strict', region: 'Республика Крым', lat: 44.92, lng: 35.2 },
  { name: 'Казантипский заповедник', category: 'Заповедник', severity: 'strict', region: 'Республика Крым', lat: 45.46, lng: 35.85 },
  { name: 'Опукский заповедник', category: 'Заповедник', severity: 'strict', region: 'Республика Крым', lat: 45.03, lng: 36.2 },
  { name: 'Заказник «Мыс Айя»', category: 'Заказник', severity: 'partial', region: 'Севастополь', lat: 44.43, lng: 33.65 },
  { name: 'Ростовский заповедник', category: 'Заповедник', severity: 'strict', region: 'Ростовская область', lat: 46.4, lng: 42.4 },
  { name: 'Заповедник «Чёрные земли»', category: 'Заповедник', severity: 'strict', region: 'Республика Калмыкия', lat: 45.8, lng: 46.3 },
  { name: 'Астраханский заповедник', category: 'Заповедник', severity: 'strict', region: 'Астраханская область', lat: 45.75, lng: 48.3 },
  { name: 'Богдинско-Баскунчакский заповедник', category: 'Заповедник', severity: 'strict', region: 'Астраханская область', lat: 48.2, lng: 46.9 },
  { name: 'Природный парк «Волго-Ахтубинская пойма»', category: 'Природный парк', severity: 'partial', region: 'Волгоградская область', lat: 48.5, lng: 44.9 }
];

/* Подвал сайта: замените заглушки на реальные значения. */
const PROJECT = {
  authors: ['Фамилия И. О.', 'Фамилия И. О.', 'Фамилия И. О.'],
  mentor: 'Фамилия И. О.',
  github: 'https://github.com/'
};
