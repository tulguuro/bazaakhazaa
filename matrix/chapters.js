// The reading's table of contents: 9 parts, 38 chapters, each reading one
// or more positions of the matrix. Structure mapped from the user's own
// datemyst.com report (2026-11-13) and checked against our calculator;
// the questions are written in our own words. `at` uses the keys that
// chapterValues() in report.js resolves.
export const CHAPTERS = [
  { title: "Хэн бэ", chapters: [
    { id: 'personality', name: "Зан чанарын онцлог", at: ["left"], asks: "Та яаж үйлдэж, бусад таныг хэрхэн хардаг вэ?" },
    { id: 'inner', name: "Дотоод зан чанар", at: ["top"], asks: "Хэн ч харахгүй үед таны дотор юу болдог вэ?" },
    { id: 'communication', name: "Харилцааны хэв маяг", at: ["centre"], asks: "Та яаж ярьж, яаж сонсож, юуг хэлэлгүй үлдээдэг вэ?" },
    { id: 'body-karma', name: "Биеийн үйлийн үр", at: ["right"], asks: "Та бие, эрч хүчээ хэрхэн авч явдаг вэ, тэр зуршил хаанаас ирсэн бэ?" },
  ] },
  { title: "Удмын үйлийн үр", chapters: [
    { id: 'karmic-tails', name: "Үйлийн үрийн сүүл", at: ["bottom.inner", "bottom.mid", "bottom"], asks: "Үйлийн үрийн гурван тоо хамтдаа ямар түүх өгүүлдэг вэ?" },
    { id: 'wound', name: "Өнгөрснөөс үлдсэн шарх", at: ["bottom.inner"], asks: "Давтагдаж буй хэв маяг хаанаас эхтэй вэ?" },
    { id: 'echo', name: "Одоогийн цуурай", at: ["bottom.mid"], asks: "Тэр хэв маяг өнөөдөр, энгийн нэг долоо хоногт ямар харагддаг вэ?" },
    { id: 'key', name: "Чөлөөлөх түлхүүр", at: ["bottom"], asks: "Энэ хэв маягийг яг юу тайлдаг вэ?" },
    { id: 'spiritual-karma', name: "Сүнслэг үйлийн үр", at: ["top"], asks: "Та удмаасаа ямар итгэл үнэмшил тээж явдаг вэ?" },
    { id: 'father-karma', name: "Эцгийн үйлийн үр", at: ["tl"], asks: "Эцгийн удмаар танд юу ирсэн бэ?" },
    { id: 'mother-karma', name: "Эхийн үйлийн үр", at: ["tr"], asks: "Эхийн удмаар танд юу ирсэн бэ?" },
  ] },
  { title: "Сүнс ба тав тухын бүс", chapters: [
    { id: 'comfort', name: "Тав тухын бүс", at: ["centre"], asks: "Та хаана амардаг, тэндээс юу таныг гаргахгүй байлгадаг вэ?" },
    { id: 'family-comfort', name: "Удмын тав тухын бүс", at: ["familyCentre"], asks: "Таны удамд юуг аюулгүй гэж үздэг байсан бэ?" },
    { id: 'soul-mission', name: "Сүнсний гол зорилго", at: ["right"], asks: "Та юуны төлөө ирсэн бэ, таныг явсны дараа юу үлдэх ёстой вэ?" },
    { id: 'soul-challenge', name: "Сүнсний гол сорилт", at: ["bottom"], asks: "Та насан туршдаа юутай тэмцэж явдаг вэ?" },
  ] },
  { title: "Мөнгө", chapters: [
    { id: 'money-stone', name: "Санхүүгийн чулуу", at: ["right"], asks: "Мөнгөний хувьд та юун дээр тулгуурладаг вэ?" },
    { id: 'money-start', name: "Санхүүгийн эхлэл", at: ["right.inner"], asks: "Таны мөнгөний урсгал хаанаас эхэлдэг вэ?" },
    { id: 'money-energy', name: "Санхүүгийн эрчим", at: ["right.mid"], asks: "Энэ замд хэр их түлш бий, түүнийг юу шатаадаг вэ?" },
    { id: 'money-people', name: "Мөнгө ба хүмүүс", at: ["loveMoney.mid"], asks: "Мөнгө, ойр дотны хүмүүс хоёр хаана огтлолцож, тэнд юу шийдэгддэг вэ?" },
    { id: 'money', name: "Санхүүгийн суваг", at: ["loveMoney.money"], asks: "Танд мөнгө ямар ажлаар ирдэг вэ, та мөнгөний талаар юу боддог вэ?" },
  ] },
  { title: "Харилцаа", chapters: [
    { id: 'partner', name: "Тохирох хань", at: ["loveMoney.love"], asks: "Энэ эрчим хэнтэй өсөж, хэнтэй бүдгэрдэг вэ?" },
    { id: 'relationship-channel', name: "Харилцааны суваг", at: ["bottom.inner"], asks: "Та харилцаанд хэрхэн ордог, тэнд юу давтагддаг вэ?" },
    { id: 'sexuality', name: "Бэлгийн энерги", at: ["centre", "bottom", "bottom.inner"], asks: "Хэн нэгэнтэй тайвширч, сэтгэлээ нээхэд танд юу хэрэгтэй вэ?" },
  ] },
  { title: "Авьяас", chapters: [
    { id: 'talents', name: "Авьяас", at: ["top"], asks: "Танд ямар чадвар төрөлхийн байдаг вэ, түүнийгээ ашиглахгүй байгаагаа яаж мэдэх вэ?" },
    { id: 'talents-mind', name: "Оюуны авьяас", at: ["top.mid"], asks: "Таны оюун ухаан хэрхэн ажилладаг вэ?" },
    { id: 'talents-social', name: "Нийгмийн авьяас", at: ["top.inner"], asks: "Та хүмүүсийн дунд юу авчирдаг вэ?" },
    { id: 'talents-father', name: "Эцгээс өгсөн авьяас", at: ["tl"], asks: "Эцгийн удмаас ирсэн ямар сайн зүйл ашиглагдалгүй хэвтэж байна вэ?" },
    { id: 'talents-mother', name: "Эхээс өгсөн авьяас", at: ["tr"], asks: "Эхийн удмаас ирсэн ямар сайн зүйл ашиглагдалгүй хэвтэж байна вэ?" },
  ] },
  { title: "Эцэг эх ба хүүхэд", chapters: [
    { id: 'parents', name: "Эцэг эхтэй харилцаа", at: ["left", "left.inner", "left.mid"], asks: "Энэ эрчим таны эцэг эхтэй хэрхэн нийцэж байсан бэ?" },
    { id: 'children', name: "Хүүхэдтэй харилцаа", at: ["left", "left.inner", "left.mid"], asks: "Энэ эрчим хүүхэд, залуу үеийнхэнд хэрхэн ханддаг вэ?" },
  ] },
  { title: "Амьдралын мөчлөг", chapters: [
    { id: 'age-now', name: "Одоогийн насны эрчим", at: ["ring"], asks: "Одоогийн энэ үе танд юу зааж байна вэ?" },
    { id: 'age-next', name: "Дараагийн эрчим", at: ["ring"], asks: "Удахгүй ямар эрчим эхлэх вэ?" },
    { id: 'decades', name: "Найман арван жил", at: ["left", "tl", "top", "tr", "right", "br", "bottom", "bl"], asks: "Арван жил бүр ямар эрчмээр явдаг вэ?" },
  ] },
  { title: "Хувь заяа ба удмын хөтөлбөр", chapters: [
    { id: 'destiny-personal', name: "Хувийн зорилго", at: ["purposes.personal"], asks: "Та өөрийн дотор юуг цэгцлэхээр ирсэн бэ?" },
    { id: 'destiny-social', name: "Нийгмийн зорилго", at: ["purposes.social"], asks: "Та хүмүүст болон удамдаа юу өгөхөөр ирсэн бэ?" },
    { id: 'destiny-spiritual', name: "Сүнслэг зорилго", at: ["purposes.spiritual"], asks: "Энэ хоёр замыг юу холбодог вэ?" },
    { id: 'destiny-planetary', name: "Гарагийн зорилго", at: ["purposes.planetary"], asks: "Таны замын хамгийн өргөн хүрээ юу вэ?" },
    { id: 'family-programmes', name: "Удмын хөтөлбөр, хоёр шугам", at: ["tl", "br", "tr", "bl", "familyCentre"], asks: "Удмын хоёр шугамаар ямар хөтөлбөр дамжиж ирсэн бэ?" },
  ] },
];
