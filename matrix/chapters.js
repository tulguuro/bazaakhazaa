// The reading's table of contents: 9 parts, 38 chapters, each reading one
// or more positions of the matrix. Structure mapped from the user's own
// datemyst.com report (2026-11-13) and checked against our calculator;
// the questions are written in our own words. `at` uses the keys that
// chapterValues() in report.js resolves.
export const CHAPTERS = [
  { title: "Та хэн бэ?", chapters: [
    { id: 'personality', name: "Зан чанарын онцлог", at: ["left"], asks: "Та хэрхэн авирладаг вэ? Бусад хүн таныг яаж хүлээн авдаг вэ?" },
    { id: 'inner', name: "Дотоод зан чанар", at: ["top"], asks: "Хэн ч харахгүй үед таны дотор юу болдог вэ?" },
    { id: 'core', name: "Цөм чанар", at: ["centre"], asks: "Та угтаа ямар хүн бэ, таныг юу хөдөлгөдөг вэ?" },
    { id: 'body-karma', name: "Биеийн үйлийн үр", at: ["right"], asks: "Та биеэ хэрхэн арчилж, эрч хүчээ яаж сэлбэдэг вэ? Эдгээр дадал хаанаас эхэлсэн бэ?" },
  ] },
  { title: "Удмын үйлийн үр", chapters: [
    { id: 'karmic-tails', name: "Үйлийн үрийн гурван тоо", at: ["bottom.inner", "bottom.mid", "bottom"], asks: "Үйлийн үрийн гурван тоо хамтдаа ямар түүх өгүүлдэг вэ?" },
    { id: 'wound', name: "Өнгөрснөөс үлдсэн шарх", at: ["bottom.inner"], asks: "Таны амьдралд давтагддаг хэв маяг ямар өнгөрсөн туршлагаас эхтэй вэ?" },
    { id: 'echo', name: "Одоогийн цуурай", at: ["bottom.mid"], asks: "Удмаас дамжсан хэв маяг таны өдөр тутмын амьдралд хэрхэн илэрдэг вэ?" },
    { id: 'key', name: "Чөлөөлөх түлхүүр", at: ["bottom"], asks: "Давтагддаг хэв маягаас таныг юу чөлөөлдөг вэ?" },
    { id: 'spiritual-karma', name: "Сүнслэг үйлийн үр", at: ["top"], asks: "Та удмаасаа ямар итгэл үнэмшил тээж явдаг вэ?" },
    { id: 'father-karma', name: "Эцгийн үйлийн үр", at: ["tl"], asks: "Эцгийн удмаар танд юу ирсэн бэ?" },
    { id: 'mother-karma', name: "Эхийн үйлийн үр", at: ["tr"], asks: "Эхийн удмаар танд юу ирсэн бэ?" },
  ] },
  { title: "Амьдралын зорилго, сорилт, тав тухын бүс", chapters: [
    { id: 'soul-mission', name: "Сүнсний үндсэн зорилго", at: ["right"], asks: "Та юуны төлөө ирсэн бэ, таныг явсны дараа юу үлдэх ёстой вэ?" },
    { id: 'soul-challenge', name: "Сүнсний гол сорилт", at: ["bottom"], asks: "Та насан туршдаа юутай тэмцэж явдаг вэ?" },
    { id: 'comfort', name: "Тав тухын бүс", at: ["centre"], asks: "Та хаана амардаг вэ, тэндээсээ гарахад юу саад болдог вэ?" },
    { id: 'family-comfort', name: "Удмын тав тухын бүс", at: ["familyCentre"], asks: "Таны удамд юуг аюулгүй гэж үздэг байсан бэ?" },
  ] },
  { title: "Мөнгө, ажил мэргэжил", chapters: [
    { id: 'money-stone', name: "Санхүүгийн сахилга бат", at: ["right"], asks: "Мөнгөтэй харьцахдаа та юун дээр тулгуурладаг, таны санхүүгийн сахилга бат юунаас бүрддэг вэ?" },
    { id: 'money-start', name: "Санхүүгийн эхлэл", at: ["right.inner"], asks: "Таны мөнгөний урсгал хаанаас эхэлдэг вэ?" },
    { id: 'money-energy', name: "Санхүүгийн эрчим", at: ["right.mid"], asks: "Таны мөнгөний урсгалыг юу нэмэгдүүлж, юу шавхдаг вэ?" },
    { id: 'money-people', name: "Мөнгө ба хүмүүс", at: ["loveMoney.mid"], asks: "Мөнгө ба ойр дотны хүмүүс таны амьдралд хаана огтлолцдог вэ?" },
    { id: 'money', name: "Санхүүгийн суваг", at: ["loveMoney.money"], asks: "Танд мөнгө ямар ажлаар ирдэг вэ, та мөнгөний талаар юу боддог вэ?" },
    { id: 'career', name: "Ажил мэргэжил", at: ["top", "loveMoney.money"], asks: "Таны авьяас, мөнгөний сувагт ямар ажил мэргэжил хамгийн сайн тохирох вэ?" },
  ] },
  { title: "Харилцаа", chapters: [
    { id: 'partner', name: "Тохирох хань", at: ["loveMoney.love"], asks: "Та ямар хүнтэй хамт өсөж, ямар хүний дэргэд бүдгэрдэг вэ?" },
    { id: 'relationship-channel', name: "Харилцааны суваг", at: ["bottom.inner"], asks: "Та харилцаанд хэрхэн ордог, тэнд юу давтагддаг вэ?" },
    { id: 'sexuality', name: "Бэлгийн эрчим", at: ["centre", "bottom", "bottom.inner"], asks: "Дотно харилцаанд бүрэн тайвширч, нээгдэхэд танд юу хэрэгтэй вэ?" },
  ] },
  { title: "Авьяас", chapters: [
    { id: 'talents', name: "Авьяас", at: ["top"], asks: "Танд ямар чадвар төрөлхийн байдаг вэ, түүнийгээ ашиглахгүй байгаа нь юунаас илэрдэг вэ?" },
    { id: 'talents-mind', name: "Оюуны авьяас", at: ["top.mid"], asks: "Таны оюун ухаан хэрхэн ажилладаг вэ?" },
    { id: 'talents-social', name: "Нийгмийн авьяас", at: ["top.inner"], asks: "Та хүмүүсийн дунд юу авчирдаг вэ?" },
    { id: 'talents-father', name: "Эцгээс өгсөн авьяас", at: ["tl"], asks: "Эцгийн удмаас танд ямар авьяас ирсэн бэ, та түүнийгээ ашиглаж чадаж байна уу?" },
    { id: 'talents-mother', name: "Эхээс өгсөн авьяас", at: ["tr"], asks: "Эхийн удмаас танд ямар авьяас ирсэн бэ, та түүнийгээ ашиглаж чадаж байна уу?" },
  ] },
  { title: "Эцэг эх ба хүүхэд", chapters: [
    { id: 'parents', name: "Эцэг эхтэйгээ харилцах нь", at: ["left", "left.inner", "left.mid"], asks: "Та эцэг эхтэйгээ ямар харилцаатай байсан, энэ нь таныг хэрхэн төлөвшүүлсэн бэ?" },
    { id: 'children', name: "Хүүхэдтэйгээ харилцах нь", at: ["left", "left.inner", "left.mid"], asks: "Та хүүхэд, залуу үеийнхэнд хэрхэн ханддаг, тэдэнд юу өгдөг вэ?" },
  ] },
  { title: "Амьдралын мөчлөг", chapters: [
    { id: 'age-now', name: "Одоогийн насны эрчим", at: ["ring"], asks: "Таны одоогийн насны үе танд юу зааж байна вэ?" },
    { id: 'age-next', name: "Долоон үеийн өвөг дээдсийн захиас", at: ["ring"], asks: "Ирэх насны үедээ та долоон үеийн өвөг дээдсээсээ өвлөсөн ямар том даалгаврыг биелүүлэх вэ?" },
    { id: 'decades', name: "Арван жилийн найман үе", at: ["left", "tl", "top", "tr", "right", "br", "bottom", "bl"], asks: "Таны амьдралын арван жил бүр ямар эрчимтэй өнгөрдөг вэ?" },
  ] },
  { title: "Хувь заяа ба удмын өв", chapters: [
    { id: 'destiny-personal', name: "Хувийн зорилго", at: ["purposes.personal"], asks: "Та өөрийн дотор юуг цэгцлэхээр ирсэн бэ?" },
    { id: 'destiny-social', name: "Нийгмийн зорилго", at: ["purposes.social"], asks: "Та хүмүүст болон удамдаа юу өгөхөөр ирсэн бэ?" },
    { id: 'destiny-spiritual', name: "Сүнслэг зорилго", at: ["purposes.spiritual"], asks: "Таны хувийн зам, нийгмийн зам хоёрыг юу нэгтгэдэг вэ?" },
    { id: 'destiny-planetary', name: "Хорвоо ертөнцийн зорилго", at: ["purposes.planetary"], asks: "Та хүн төрөлхтөнд юугаар хувь нэмэр оруулж чадах вэ?" },
    { id: 'family-programmes', name: "Хоёр удмын өв", at: ["tl", "br", "tr", "bl", "familyCentre"], asks: "Хоёр удмаас танд ямар өв, ямар уламжлал дамжиж ирсэн бэ?" },
  ] },
];
