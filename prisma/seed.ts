import {
  AdminPermission,
  AnalyticsDeliveryStatus,
  AnalyticsEventName,
  AvailabilityStatus,
  CheckoutAttemptStatus,
  ContentImportJobStatus,
  CurrencyCode,
  OrderStatus,
  PaymentMethodCode,
  PaymentStatus,
  PublishStatus,
  StagedBookStatus,
  UserRole,
} from "../src/generated/prisma/enums.js";
import { closePgPool } from "../src/infra/database/pg";
import { disconnectPrisma, getPrismaClient } from "../src/infra/database/prisma";
import { hashPassword } from "../src/shared/utils/password";

const authorSeeds = [
  {
    slug: "nguyen-nhat-anh",
    name: "Nguyễn Nhật Ánh",
    biography:
      "Nhà văn nổi bật của văn học Việt Nam đương đại, được yêu thích với các tác phẩm về tuổi học trò và ký ức thanh xuân.",
  },
  {
    slug: "to-hoai",
    name: "Tô Hoài",
    biography:
      "Nhà văn Việt Nam nổi tiếng với những tác phẩm giàu chất quan sát đời sống, đặc biệt là mảng văn học thiếu nhi.",
  },
  {
    slug: "george-orwell",
    name: "George Orwell",
    biography:
      "Nhà văn người Anh với nhiều tác phẩm kinh điển về xã hội, chính trị và bản chất quyền lực.",
  },
  {
    slug: "james-clear",
    name: "James Clear",
    biography:
      "Tác giả và diễn giả nổi tiếng về chủ đề thói quen, tăng trưởng cá nhân và hiệu suất bền vững.",
  },
  {
    slug: "dale-carnegie",
    name: "Dale Carnegie",
    biography:
      "Tác giả kinh điển trong mảng giao tiếp, phát triển bản thân và xây dựng quan hệ.",
  },
  {
    slug: "paulo-coelho",
    name: "Paulo Coelho",
    biography:
      "Nhà văn Brazil được biết đến với những tác phẩm mang màu sắc chiêm nghiệm và hành trình nội tâm.",
  },
  {
    slug: "daniel-kahneman",
    name: "Daniel Kahneman",
    biography:
      "Nhà tâm lý học đoạt Nobel Kinh tế, nổi tiếng với các nghiên cứu về tư duy, nhận thức và ra quyết định.",
  },
  {
    slug: "viktor-frankl",
    name: "Viktor E. Frankl",
    biography:
      "Bác sĩ tâm thần và nhà tư tưởng nhân văn, được biết đến với liệu pháp ý nghĩa và các tác phẩm truyền cảm hứng.",
  },
  {
    slug: "nguyen-phong",
    name: "Nguyên Phong",
    biography:
      "Dịch giả, tác giả được độc giả Việt Nam yêu thích ở mảng sách chiêm nghiệm, văn hóa và hành trình tinh thần.",
  },
  {
    slug: "jose-mauro-de-vasconcelos",
    name: "José Mauro de Vasconcelos",
    biography:
      "Nhà văn Brazil nổi tiếng với những tác phẩm giàu cảm xúc về tuổi thơ và sự trưởng thành.",
  },
  {
    slug: "hector-malot",
    name: "Hector Malot",
    biography:
      "Nhà văn Pháp với nhiều tác phẩm kinh điển dành cho thiếu nhi và thanh thiếu niên.",
  },
  {
    slug: "hamlet-truong",
    name: "Hamlet Trương",
    biography:
      "Tác giả Việt Nam hiện đại với các tác phẩm giàu chất tự sự, cảm xúc và góc nhìn chữa lành.",
  },
  {
    slug: "stephen-r-covey",
    name: "Stephen R. Covey",
    biography:
      "Tác giả nổi tiếng toàn cầu với các tác phẩm về hiệu quả cá nhân, lãnh đạo bản thân và phát triển bền vững.",
  },
  {
    slug: "ichiro-kishimi",
    name: "Ichiro Kishimi",
    biography:
      "Tác giả và nhà tư vấn người Nhật được biết đến với các tác phẩm về tâm lý học Adler và sự trưởng thành nội tâm.",
  },
  {
    slug: "robin-sharma",
    name: "Robin Sharma",
    biography:
      "Diễn giả và tác giả quốc tế nổi bật ở mảng lãnh đạo cá nhân, hiệu suất và xây dựng cuộc sống có chủ đích.",
  },
  {
    slug: "thich-nhat-hanh",
    name: "Thích Nhất Hạnh",
    biography:
      "Thiền sư, tác giả và nhà hoạt động vì hòa bình, có ảnh hưởng sâu rộng qua các tác phẩm về chánh niệm và sống tỉnh thức.",
  },
  {
    slug: "yuval-noah-harari",
    name: "Yuval Noah Harari",
    biography:
      "Sử gia và tác giả nổi tiếng với các tác phẩm giúp độc giả nhìn lại lịch sử, văn minh và tương lai loài người.",
  },
  {
    slug: "carol-s-dweck",
    name: "Carol S. Dweck",
    biography:
      "Nhà tâm lý học nổi tiếng với nghiên cứu về tư duy phát triển, động lực và cách con người học hỏi qua thử thách.",
  },
  {
    slug: "mark-manson",
    name: "Mark Manson",
    biography:
      "Tác giả hiện đại được nhiều độc giả trẻ quan tâm nhờ lối viết thẳng thắn về giá trị sống và sức khỏe tinh thần.",
  },
  {
    slug: "morgan-housel",
    name: "Morgan Housel",
    biography:
      "Nhà văn và nhà phân tích tài chính nổi tiếng với những góc nhìn dễ hiểu về hành vi con người và tiền bạc.",
  },
  {
    slug: "charles-duhigg",
    name: "Charles Duhigg",
    biography:
      "Tác giả nổi tiếng với các tác phẩm về thói quen, năng suất và cách hành vi được hình thành trong đời sống hàng ngày.",
  },
  {
    slug: "cal-newport",
    name: "Cal Newport",
    biography:
      "Tác giả và giáo sư nổi tiếng với các cuốn sách về tập trung sâu, hiệu suất tri thức và lao động có chất lượng.",
  },
  {
    slug: "shunmyo-masuno",
    name: "Shunmyo Masuno",
    biography:
      "Thiền sư người Nhật với nhiều tác phẩm giản dị, thực tế về sống tối giản, lắng lại và chăm sóc đời sống nội tâm.",
  },
] as const;

const publisherSeeds = [
  {
    slug: "nxb-tre",
    name: "Nhà xuất bản Trẻ",
    description:
      "Đơn vị xuất bản lớn với nhiều đầu sách văn học Việt Nam, kỹ năng và đời sống được độc giả yêu thích.",
  },
  {
    slug: "nha-nam",
    name: "Nhã Nam",
    description:
      "Thương hiệu xuất bản quen thuộc với bạn đọc yêu văn học, sách thiếu nhi và các tác phẩm dịch chất lượng.",
  },
  {
    slug: "alphabooks",
    name: "Alpha Books",
    description:
      "Nhà xuất bản và phát hành nổi bật ở mảng kinh doanh, phát triển bản thân và tư duy quản trị.",
  },
  {
    slug: "first-news",
    name: "First News - Trí Việt",
    description:
      "Đơn vị phát hành quen thuộc với nhiều tựa sách truyền cảm hứng, phát triển cá nhân và giá trị sống.",
  },
  {
    slug: "nxb-kim-dong",
    name: "Nhà xuất bản Kim Đồng",
    description:
      "Thương hiệu lâu năm gắn liền với sách thiếu nhi, truyện thiếu niên và nhiều tác phẩm kinh điển cho tuổi nhỏ.",
  },
  {
    slug: "thai-ha-books",
    name: "Thái Hà Books",
    description:
      "Đơn vị phát hành quen thuộc ở mảng kỹ năng sống, phát triển bản thân, kinh doanh và các tựa sách nuôi dưỡng tư duy.",
  },
  {
    slug: "az-viet-nam",
    name: "AZ Việt Nam",
    description:
      "Đơn vị phát hành được nhiều bạn đọc trẻ biết đến với các tựa sách đời sống, chữa lành và khám phá bản thân.",
  },
] as const;

const categorySeeds = [
  {
    slug: "van-hoc",
    name: "Văn học",
    description:
      "Danh mục dành cho tiểu thuyết, truyện dài, tác phẩm kinh điển và những đầu sách giàu giá trị nghệ thuật.",
    isFeatured: true,
    sortOrder: 1,
  },
  {
    slug: "kinh-doanh",
    name: "Kinh doanh",
    description:
      "Danh mục tập trung vào tư duy quản trị, năng lực ra quyết định, hiệu suất và phát triển nghề nghiệp.",
    isFeatured: true,
    sortOrder: 2,
  },
  {
    slug: "thieu-nhi",
    name: "Thiếu nhi",
    description:
      "Danh mục cho độc giả nhỏ tuổi và những cuốn sách nuôi dưỡng trí tưởng tượng, lòng nhân ái và niềm vui đọc.",
    isFeatured: true,
    sortOrder: 3,
  },
  {
    slug: "ky-nang-song",
    name: "Kỹ năng sống",
    description:
      "Danh mục dành cho phát triển bản thân, xây dựng thói quen tốt và sống chủ động, bền vững hơn mỗi ngày.",
    isFeatured: true,
    sortOrder: 4,
  },
  {
    slug: "tam-ly-hoc",
    name: "Tâm lý học",
    description:
      "Nhóm sách về nhận thức, hành vi, ý nghĩa sống và cách con người đưa ra quyết định trong đời sống thực tế.",
    isFeatured: false,
    sortOrder: 5,
  },
  {
    slug: "van-hoa-xa-hoi",
    name: "Văn hóa - Xã hội",
    description:
      "Danh mục dành cho những đầu sách giúp mở rộng góc nhìn về lịch sử, xã hội, con người và bối cảnh văn minh.",
    isFeatured: false,
    sortOrder: 6,
  },
] as const;

const collectionSeeds = [
  {
    slug: "tuan-le-doc-sach",
    name: "Tuần lễ đọc sách",
    description:
      "Bộ sưu tập nổi bật dành cho những độc giả muốn bắt đầu lại thói quen đọc với nhiều thể loại dễ tiếp cận.",
    publishStatus: PublishStatus.PUBLISHED,
    isFeatured: true,
    sortOrder: 1,
  },
  {
    slug: "song-toi-uu-moi-ngay",
    name: "Sống tối ưu mỗi ngày",
    description:
      "Tuyển chọn các đầu sách về thói quen, tư duy và quản trị bản thân để hỗ trợ cải thiện chất lượng sống.",
    publishStatus: PublishStatus.PUBLISHED,
    isFeatured: true,
    sortOrder: 2,
  },
  {
    slug: "van-hoc-viet-noi-bat",
    name: "Văn học Việt nổi bật",
    description:
      "Những tựa sách được nhiều độc giả Việt tìm đọc, phù hợp để khám phá văn học trong nước một cách gần gũi.",
    publishStatus: PublishStatus.PUBLISHED,
    isFeatured: true,
    sortOrder: 3,
  },
  {
    slug: "doc-cung-tuoi-tho",
    name: "Đọc cùng tuổi thơ",
    description:
      "Bộ sưu tập nhẹ nhàng cho độc giả nhỏ tuổi và cả những người lớn muốn tìm lại cảm giác trong trẻo khi đọc.",
    publishStatus: PublishStatus.PUBLISHED,
    isFeatured: true,
    sortOrder: 4,
  },
  {
    slug: "tu-duy-va-ra-quyet-dinh",
    name: "Tư duy và ra quyết định",
    description:
      "Bộ sưu tập tập trung vào các đầu sách về nhận thức, hành vi, chiến lược tư duy và ra quyết định sáng suốt hơn.",
    publishStatus: PublishStatus.PUBLISHED,
    isFeatured: true,
    sortOrder: 5,
  },
  {
    slug: "song-cham-va-chua-lanh",
    name: "Sống chậm và chữa lành",
    description:
      "Những cuốn sách giúp người đọc đi chậm lại, quan sát bản thân kỹ hơn và xây dựng nhịp sống cân bằng hơn.",
    publishStatus: PublishStatus.PUBLISHED,
    isFeatured: true,
    sortOrder: 6,
  },
] as const;

const bookSeeds = [
  {
    slug: "mat-biec",
    title: "Mắt Biếc",
    authorSlug: "nguyen-nhat-anh",
    publisherSlug: "nxb-tre",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 98000,
    compareAtAmount: 115000,
    shippingFeeAmount: 30000,
    pageCount: 320,
    languageCode: "vi",
    isbn: "9786041000011",
    publishedAt: new Date("2019-06-01T00:00:00.000Z"),
    inventoryQuantity: 24,
    isFeatured: true,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 100,
    shortDescription:
      "Một câu chuyện day dứt về tuổi trẻ, ký ức và những cảm xúc không dễ gọi thành tên.",
    description:
      "Mắt Biếc là tựa sách phù hợp để seed homepage, PDP và search nhờ độ nhận diện cao, mô tả rõ ràng và ngôn ngữ gần gũi.",
    keywords: ["văn học Việt Nam", "thanh xuân", "tuổi học trò"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người lớn",
    },
    categories: [{ slug: "van-hoc", isPrimary: true }],
    collections: ["tuan-le-doc-sach", "van-hoc-viet-noi-bat"],
  },
  {
    slug: "cho-toi-xin-mot-ve-di-tuoi-tho",
    title: "Cho Tôi Xin Một Vé Đi Tuổi Thơ",
    authorSlug: "nguyen-nhat-anh",
    publisherSlug: "nxb-tre",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 91000,
    compareAtAmount: 105000,
    shippingFeeAmount: 25000,
    pageCount: 208,
    languageCode: "vi",
    isbn: "9786041000012",
    publishedAt: new Date("2018-01-15T00:00:00.000Z"),
    inventoryQuantity: 18,
    isFeatured: true,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 96,
    shortDescription:
      "Một tấm vé trở về ký ức tuổi nhỏ, nơi sự hồn nhiên và những câu hỏi lớn cùng tồn tại.",
    description:
      "Tựa sách hỗ trợ rất tốt cho listing, collection thiếu nhi và search theo tác giả nhờ độ phủ thương hiệu cao.",
    keywords: ["thiếu nhi", "tuổi thơ", "văn học Việt Nam"],
    metadata: {
      format: "Bìa mềm",
      audience: "Mọi lứa tuổi",
    },
    categories: [
      { slug: "thieu-nhi", isPrimary: true },
      { slug: "van-hoc" },
    ],
    collections: ["tuan-le-doc-sach", "doc-cung-tuoi-tho", "van-hoc-viet-noi-bat"],
  },
  {
    slug: "toi-thay-hoa-vang-tren-co-xanh",
    title: "Tôi Thấy Hoa Vàng Trên Cỏ Xanh",
    authorSlug: "nguyen-nhat-anh",
    publisherSlug: "nxb-tre",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 108000,
    compareAtAmount: 122000,
    shippingFeeAmount: 25000,
    pageCount: 384,
    languageCode: "vi",
    isbn: "9786041000013",
    publishedAt: new Date("2017-04-01T00:00:00.000Z"),
    inventoryQuantity: 14,
    isFeatured: true,
    isBestseller: false,
    isRecommended: true,
    sortWeight: 92,
    shortDescription:
      "Một câu chuyện trong trẻo mà thấm thía về gia đình, làng quê và những chuyển động đầu đời.",
    description:
      "Dữ liệu phù hợp cho homepage, category văn học và các block khám phá sách Việt Nam nổi bật.",
    keywords: ["văn học Việt Nam", "gia đình", "làng quê"],
    metadata: {
      format: "Bìa mềm",
      audience: "Mọi lứa tuổi",
    },
    categories: [
      { slug: "van-hoc", isPrimary: true },
      { slug: "thieu-nhi" },
    ],
    collections: ["van-hoc-viet-noi-bat"],
  },
  {
    slug: "de-men-phieu-luu-ky",
    title: "Dế Mèn Phiêu Lưu Ký",
    authorSlug: "to-hoai",
    publisherSlug: "nxb-kim-dong",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 88000,
    compareAtAmount: 99000,
    shippingFeeAmount: 25000,
    pageCount: 152,
    languageCode: "vi",
    isbn: "9786041000014",
    publishedAt: new Date("2020-05-20T00:00:00.000Z"),
    inventoryQuantity: 20,
    isFeatured: true,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 90,
    shortDescription:
      "Tác phẩm kinh điển của tuổi thơ Việt, giàu trí tưởng tượng và sức sống.",
    description:
      "Dữ liệu rất phù hợp để kiểm thử category thiếu nhi, collection dành cho độc giả nhỏ tuổi và search theo tác giả Việt.",
    keywords: ["thiếu nhi", "kinh điển", "phiêu lưu"],
    metadata: {
      format: "Bìa mềm",
      audience: "Thiếu nhi",
    },
    categories: [{ slug: "thieu-nhi", isPrimary: true }],
    collections: ["tuan-le-doc-sach", "doc-cung-tuoi-tho"],
  },
  {
    slug: "khong-gia-dinh",
    title: "Không Gia Đình",
    authorSlug: "hector-malot",
    publisherSlug: "nxb-kim-dong",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 126000,
    compareAtAmount: 145000,
    shippingFeeAmount: 25000,
    pageCount: 520,
    languageCode: "vi",
    isbn: "9786041000015",
    publishedAt: new Date("2021-03-10T00:00:00.000Z"),
    inventoryQuantity: 11,
    isFeatured: false,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 82,
    shortDescription:
      "Tác phẩm kinh điển về hành trình trưởng thành, nghị lực sống và lòng nhân hậu.",
    description:
      "Dữ liệu bổ sung chiều sâu cho danh mục thiếu nhi và giúp search theo nhà xuất bản, thể loại ổn định hơn.",
    keywords: ["thiếu nhi", "kinh điển", "trưởng thành"],
    metadata: {
      format: "Bìa mềm",
      audience: "Thiếu niên",
    },
    categories: [
      { slug: "thieu-nhi", isPrimary: true },
      { slug: "van-hoc" },
    ],
    collections: ["doc-cung-tuoi-tho"],
  },
  {
    slug: "cay-cam-ngot-cua-toi",
    title: "Cây Cam Ngọt Của Tôi",
    authorSlug: "jose-mauro-de-vasconcelos",
    publisherSlug: "nha-nam",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 112000,
    compareAtAmount: 128000,
    shippingFeeAmount: 25000,
    pageCount: 244,
    languageCode: "vi",
    isbn: "9786041000016",
    publishedAt: new Date("2022-07-01T00:00:00.000Z"),
    inventoryQuantity: 13,
    isFeatured: false,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 84,
    shortDescription:
      "Một cuốn sách giàu cảm xúc về tuổi thơ, tình thương và những nỗi đau được nhìn bằng đôi mắt trẻ nhỏ.",
    description:
      "Dữ liệu hỗ trợ tốt cho collection thiếu nhi và các truy vấn liên quan tới sách cảm xúc, chữa lành.",
    keywords: ["thiếu nhi", "cảm động", "tuổi thơ"],
    metadata: {
      format: "Bìa mềm",
      audience: "Mọi lứa tuổi",
    },
    categories: [{ slug: "thieu-nhi", isPrimary: true }],
    collections: ["doc-cung-tuoi-tho"],
  },
  {
    slug: "1984",
    title: "1984",
    authorSlug: "george-orwell",
    publisherSlug: "nha-nam",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 135000,
    compareAtAmount: 150000,
    shippingFeeAmount: 30000,
    pageCount: 360,
    languageCode: "en",
    isbn: "9786041000017",
    publishedAt: new Date("2020-09-01T00:00:00.000Z"),
    inventoryQuantity: 12,
    isFeatured: false,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 80,
    shortDescription:
      "Tiểu thuyết kinh điển về kiểm soát, quyền lực và sự thật trong một xã hội toàn trị.",
    description:
      "Đây là dữ liệu quan trọng để kiểm thử search, listing văn học và các luồng analytics liên quan đến sách quốc tế.",
    keywords: ["kinh điển", "dystopia", "tiểu thuyết"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người lớn",
    },
    categories: [{ slug: "van-hoc", isPrimary: true }],
    collections: ["tuan-le-doc-sach"],
  },
  {
    slug: "animal-farm",
    title: "Trại Súc Vật",
    subtitle: "Animal Farm",
    authorSlug: "george-orwell",
    publisherSlug: "nha-nam",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.OUT_OF_STOCK,
    priceAmount: 128000,
    compareAtAmount: 145000,
    shippingFeeAmount: 30000,
    pageCount: 168,
    languageCode: "en",
    isbn: "9786041000018",
    publishedAt: new Date("2021-05-01T00:00:00.000Z"),
    inventoryQuantity: 0,
    isFeatured: false,
    isBestseller: true,
    isRecommended: false,
    sortWeight: 74,
    shortDescription:
      "Tác phẩm châm biếm kinh điển, phù hợp để kiểm thử trạng thái hết hàng và rule storefront.",
    description:
      "Bản seed này được giữ ở trạng thái OUT_OF_STOCK để kiểm thử cảnh báo mua hàng và luồng hiển thị tồn kho.",
    keywords: ["kinh điển", "châm biếm", "xã hội"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người lớn",
    },
    categories: [{ slug: "van-hoc", isPrimary: true }],
    collections: [],
  },
  {
    slug: "nha-gia-kim",
    title: "Nhà Giả Kim",
    authorSlug: "paulo-coelho",
    publisherSlug: "nha-nam",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 99000,
    compareAtAmount: 118000,
    shippingFeeAmount: 25000,
    pageCount: 228,
    languageCode: "vi",
    isbn: "9786041000019",
    publishedAt: new Date("2022-10-01T00:00:00.000Z"),
    inventoryQuantity: 16,
    isFeatured: true,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 86,
    shortDescription:
      "Một hành trình đi tìm kho báu cũng là hành trình lắng nghe tiếng gọi chân thật nhất từ bên trong.",
    description:
      "Tựa sách này giúp dữ liệu search và recommendation phong phú hơn ở nhóm sách văn học giàu tính chiêm nghiệm.",
    keywords: ["chiêm nghiệm", "hành trình", "truyền cảm hứng"],
    metadata: {
      format: "Bìa mềm",
      audience: "Mọi lứa tuổi",
    },
    categories: [{ slug: "van-hoc", isPrimary: true }],
    collections: ["tuan-le-doc-sach"],
  },
  {
    slug: "trai-tim-ben-le-phai",
    title: "Trái Tim Bên Lề Phải",
    authorSlug: "hamlet-truong",
    publisherSlug: "nha-nam",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.LOW_STOCK,
    priceAmount: 124000,
    compareAtAmount: 139000,
    shippingFeeAmount: 30000,
    pageCount: 280,
    languageCode: "vi",
    isbn: "9786041000020",
    publishedAt: new Date("2021-11-15T00:00:00.000Z"),
    inventoryQuantity: 4,
    isFeatured: false,
    isBestseller: false,
    isRecommended: true,
    sortWeight: 70,
    shortDescription:
      "Một cuốn sách giàu cảm xúc về những chỗ chông chênh, tự chữa lành và học cách ở lại với chính mình.",
    description:
      "Giữ lại slug cũ để không làm bẩn dữ liệu lịch sử, nhưng nâng chất lượng hiển thị thành một bản ghi hợp lý hơn cho dev/test.",
    keywords: ["chữa lành", "cảm xúc", "tản văn"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người trẻ",
    },
    categories: [
      { slug: "van-hoc", isPrimary: true },
      { slug: "ky-nang-song" },
    ],
    collections: ["tuan-le-doc-sach"],
  },
  {
    slug: "atomic-habits",
    title: "Atomic Habits",
    subtitle: "Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ",
    authorSlug: "james-clear",
    publisherSlug: "alphabooks",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.LOW_STOCK,
    priceAmount: 172000,
    compareAtAmount: 199000,
    shippingFeeAmount: 30000,
    pageCount: 320,
    languageCode: "vi",
    isbn: "9786041000021",
    publishedAt: new Date("2023-02-01T00:00:00.000Z"),
    inventoryQuantity: 3,
    isFeatured: true,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 94,
    shortDescription:
      "Cuốn sách nổi tiếng về cách xây thói quen bền vững bằng những thay đổi nhỏ nhưng nhất quán.",
    description:
      "Đây là bản ghi quan trọng cho cart, checkout và search vì thường xuyên xuất hiện trong các flow regression.",
    keywords: ["thói quen", "phát triển bản thân", "năng suất"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người đi làm",
    },
    categories: [
      { slug: "ky-nang-song", isPrimary: true },
      { slug: "kinh-doanh" },
    ],
    collections: ["song-toi-uu-moi-ngay"],
  },
  {
    slug: "dac-nhan-tam",
    title: "Đắc Nhân Tâm",
    authorSlug: "dale-carnegie",
    publisherSlug: "first-news",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 149000,
    compareAtAmount: 165000,
    shippingFeeAmount: 30000,
    pageCount: 320,
    languageCode: "vi",
    isbn: "9786041000022",
    publishedAt: new Date("2020-08-15T00:00:00.000Z"),
    inventoryQuantity: 9,
    isFeatured: true,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 88,
    shortDescription:
      "Cuốn sách kinh điển về giao tiếp, xây dựng thiện cảm và ứng xử hiệu quả trong đời sống.",
    description:
      "Dữ liệu phù hợp cho danh mục kỹ năng sống, search theo tác giả và recommendation trong nhóm self-help.",
    keywords: ["giao tiếp", "kỹ năng sống", "kinh điển"],
    metadata: {
      format: "Bìa mềm",
      audience: "Mọi lứa tuổi",
    },
    categories: [
      { slug: "ky-nang-song", isPrimary: true },
      { slug: "kinh-doanh" },
    ],
    collections: ["song-toi-uu-moi-ngay"],
  },
  {
    slug: "tu-duy-nhanh-va-cham",
    title: "Tư Duy Nhanh Và Chậm",
    authorSlug: "daniel-kahneman",
    publisherSlug: "alphabooks",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 215000,
    compareAtAmount: 245000,
    shippingFeeAmount: 30000,
    pageCount: 640,
    languageCode: "vi",
    isbn: "9786041000023",
    publishedAt: new Date("2022-03-25T00:00:00.000Z"),
    inventoryQuantity: 8,
    isFeatured: false,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 78,
    shortDescription:
      "Một cuốn sách nền tảng về nhận thức, thiên kiến và cách con người ra quyết định.",
    description:
      "Tựa sách này giúp bộ dữ liệu có chiều sâu hơn ở nhóm tâm lý học và kinh doanh, đặc biệt hữu ích cho filter theo giá.",
    keywords: ["tâm lý học", "ra quyết định", "hành vi"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người đi làm",
    },
    categories: [
      { slug: "tam-ly-hoc", isPrimary: true },
      { slug: "kinh-doanh" },
    ],
    collections: ["song-toi-uu-moi-ngay"],
  },
  {
    slug: "di-tim-le-song",
    title: "Đi Tìm Lẽ Sống",
    authorSlug: "viktor-frankl",
    publisherSlug: "first-news",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 118000,
    compareAtAmount: 132000,
    shippingFeeAmount: 25000,
    pageCount: 232,
    languageCode: "vi",
    isbn: "9786041000024",
    publishedAt: new Date("2021-09-01T00:00:00.000Z"),
    inventoryQuantity: 12,
    isFeatured: false,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 76,
    shortDescription:
      "Một tác phẩm sâu sắc về ý nghĩa sống, sức chịu đựng và khả năng đứng dậy sau nghịch cảnh.",
    description:
      "Dữ liệu giúp nhóm sách tâm lý học và chữa lành có thêm đại diện rõ nét, hữu ích cho search và suggestion.",
    keywords: ["ý nghĩa sống", "tâm lý học", "chữa lành"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người lớn",
    },
    categories: [
      { slug: "tam-ly-hoc", isPrimary: true },
      { slug: "ky-nang-song" },
    ],
    collections: ["song-toi-uu-moi-ngay"],
  },
  {
    slug: "muon-kiep-nhan-sinh",
    title: "Muôn Kiếp Nhân Sinh",
    authorSlug: "nguyen-phong",
    publisherSlug: "first-news",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 188000,
    compareAtAmount: 215000,
    shippingFeeAmount: 30000,
    pageCount: 408,
    languageCode: "vi",
    isbn: "9786041000025",
    publishedAt: new Date("2020-12-01T00:00:00.000Z"),
    inventoryQuantity: 10,
    isFeatured: true,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 84,
    shortDescription:
      "Tựa sách được quan tâm mạnh ở mảng chiêm nghiệm và đời sống tinh thần dành cho độc giả trưởng thành.",
    description:
      "Dữ liệu phù hợp để mở rộng recommendation rule-based ở nhóm sách truyền cảm hứng và sống chậm.",
    keywords: ["chiêm nghiệm", "đời sống", "truyền cảm hứng"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người lớn",
    },
    categories: [{ slug: "ky-nang-song", isPrimary: true }],
    collections: ["song-toi-uu-moi-ngay", "tuan-le-doc-sach"],
  },
  {
    slug: "hanh-trinh-ve-phuong-dong",
    title: "Hành Trình Về Phương Đông",
    authorSlug: "nguyen-phong",
    publisherSlug: "first-news",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 154000,
    compareAtAmount: 176000,
    shippingFeeAmount: 30000,
    pageCount: 348,
    languageCode: "vi",
    isbn: "9786041000026",
    publishedAt: new Date("2021-06-10T00:00:00.000Z"),
    inventoryQuantity: 7,
    isFeatured: false,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 72,
    shortDescription:
      "Cuốn sách giàu chất trải nghiệm, gợi mở về tri thức, nội tâm và hành trình trưởng thành.",
    description:
      "Dữ liệu bổ sung cho bộ sưu tập phát triển bản thân và tạo thêm chiều sâu cho kết quả search tiếng Việt có dấu.",
    keywords: ["chiêm nghiệm", "tri thức", "hành trình"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người lớn",
    },
    categories: [{ slug: "ky-nang-song", isPrimary: true }],
    collections: ["song-toi-uu-moi-ngay"],
  },
  {
    slug: "quang-ganh-lo-di-va-vui-song",
    title: "Quẳng Gánh Lo Đi Và Vui Sống",
    authorSlug: "dale-carnegie",
    publisherSlug: "first-news",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 139000,
    compareAtAmount: 156000,
    shippingFeeAmount: 30000,
    pageCount: 352,
    languageCode: "vi",
    isbn: "9786041000027",
    publishedAt: new Date("2019-09-20T00:00:00.000Z"),
    inventoryQuantity: 11,
    isFeatured: false,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 75,
    shortDescription:
      "Một tựa sách kinh điển giúp độc giả học cách quản trị lo âu và sống nhẹ nhõm hơn mỗi ngày.",
    description:
      "Bổ sung dữ liệu đẹp cho category kỹ năng sống, search theo tác giả và block gợi ý liên quan trong cùng chủ đề.",
    keywords: ["giảm lo âu", "kỹ năng sống", "phát triển bản thân"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người đi làm",
    },
    categories: [{ slug: "ky-nang-song", isPrimary: true }],
    collections: ["song-toi-uu-moi-ngay"],
  },
  {
    slug: "7-thoi-quen-hieu-qua",
    title: "7 Thói Quen Hiệu Quả",
    authorSlug: "stephen-r-covey",
    publisherSlug: "thai-ha-books",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 186000,
    compareAtAmount: 209000,
    shippingFeeAmount: 30000,
    pageCount: 456,
    languageCode: "vi",
    isbn: "9786041000028",
    publishedAt: new Date("2021-02-10T00:00:00.000Z"),
    inventoryQuantity: 10,
    isFeatured: false,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 73,
    shortDescription:
      "Tựa sách nền tảng về hiệu quả cá nhân, kỷ luật và nguyên tắc sống bền vững.",
    description:
      "Phù hợp để mở rộng nhóm kỹ năng sống và kinh doanh với một đầu sách có sức nhận diện cao, hữu ích cho filter và suggestion.",
    keywords: ["hiệu quả", "kỷ luật", "phát triển bản thân"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người đi làm",
    },
    categories: [
      { slug: "ky-nang-song", isPrimary: true },
      { slug: "kinh-doanh" },
    ],
    collections: ["song-toi-uu-moi-ngay"],
  },
  {
    slug: "dam-bi-ghet",
    title: "Dám Bị Ghét",
    authorSlug: "ichiro-kishimi",
    publisherSlug: "nha-nam",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 128000,
    compareAtAmount: 146000,
    shippingFeeAmount: 25000,
    pageCount: 336,
    languageCode: "vi",
    isbn: "9786041000029",
    publishedAt: new Date("2022-01-12T00:00:00.000Z"),
    inventoryQuantity: 12,
    isFeatured: false,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 71,
    shortDescription:
      "Một cuốn sách giúp người đọc đối thoại lại với nỗi sợ đánh giá và học cách sống tự do hơn.",
    description:
      "Đây là tựa sách phù hợp cho nhóm tâm lý học và kỹ năng sống, hỗ trợ rất tốt cho recommendation liên quan tới chữa lành và trưởng thành.",
    keywords: ["tâm lý học", "trưởng thành", "tự do"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người trẻ",
    },
    categories: [
      { slug: "tam-ly-hoc", isPrimary: true },
      { slug: "ky-nang-song" },
    ],
    collections: ["song-cham-va-chua-lanh"],
  },
  {
    slug: "nha-lanh-dao-khong-chuc-danh",
    title: "Nhà Lãnh Đạo Không Chức Danh",
    authorSlug: "robin-sharma",
    publisherSlug: "thai-ha-books",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 164000,
    compareAtAmount: 185000,
    shippingFeeAmount: 30000,
    pageCount: 372,
    languageCode: "vi",
    isbn: "9786041000030",
    publishedAt: new Date("2021-10-05T00:00:00.000Z"),
    inventoryQuantity: 7,
    isFeatured: false,
    isBestseller: false,
    isRecommended: true,
    sortWeight: 66,
    shortDescription:
      "Tựa sách về tinh thần chủ động, trách nhiệm cá nhân và khả năng dẫn dắt từ bên trong.",
    description:
      "Bổ sung độ dày cho nhóm sách kinh doanh và phát triển nghề nghiệp, đặc biệt hữu ích khi test bo loc theo giá và publisher.",
    keywords: ["lãnh đạo", "chủ động", "phát triển nghề nghiệp"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người đi làm",
    },
    categories: [
      { slug: "kinh-doanh", isPrimary: true },
      { slug: "ky-nang-song" },
    ],
    collections: ["song-toi-uu-moi-ngay"],
  },
  {
    slug: "phep-la-cua-su-tinh-thuc",
    title: "Phép Lạ Của Sự Tỉnh Thức",
    authorSlug: "thich-nhat-hanh",
    publisherSlug: "first-news",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 118000,
    compareAtAmount: 132000,
    shippingFeeAmount: 25000,
    pageCount: 208,
    languageCode: "vi",
    isbn: "9786041000031",
    publishedAt: new Date("2020-04-18T00:00:00.000Z"),
    inventoryQuantity: 14,
    isFeatured: false,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 68,
    shortDescription:
      "Một cuốn sách ngắn gọn nhưng sâu sắc về chánh niệm, hiện diện và cách trở về với chính mình.",
    description:
      "Dữ liệu bổ sung rất phù hợp cho nhóm sách sống chậm, chữa lành và các block khám phá giàu tính cân bằng cảm xúc.",
    keywords: ["chánh niệm", "tỉnh thức", "an trú"],
    metadata: {
      format: "Bìa mềm",
      audience: "Mọi lứa tuổi",
    },
    categories: [{ slug: "ky-nang-song", isPrimary: true }],
    collections: ["song-cham-va-chua-lanh"],
  },
  {
    slug: "sapiens-luoc-su-loai-nguoi",
    title: "Sapiens - Lược Sử Loài Người",
    authorSlug: "yuval-noah-harari",
    publisherSlug: "nha-nam",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 228000,
    compareAtAmount: 255000,
    shippingFeeAmount: 30000,
    pageCount: 556,
    languageCode: "vi",
    isbn: "9786041000032",
    publishedAt: new Date("2022-06-30T00:00:00.000Z"),
    inventoryQuantity: 9,
    isFeatured: true,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 79,
    shortDescription:
      "Một cuốn sách mở rộng góc nhìn về lịch sử loài người, hệ niềm tin và cách văn minh được tạo dựng.",
    description:
      "Bổ sung chiều sâu dữ liệu cho nhóm văn hóa - xã hội và tạo thêm dải giá cao hơn để test sort/filter tự nhiên.",
    keywords: ["lịch sử", "xã hội", "văn minh"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người lớn",
    },
    categories: [{ slug: "van-hoa-xa-hoi", isPrimary: true }],
    collections: ["tu-duy-va-ra-quyet-dinh", "tuan-le-doc-sach"],
  },
  {
    slug: "tu-duy-mo",
    title: "Tư Duy Mở",
    authorSlug: "carol-s-dweck",
    publisherSlug: "alphabooks",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 142000,
    compareAtAmount: 159000,
    shippingFeeAmount: 30000,
    pageCount: 304,
    languageCode: "vi",
    isbn: "9786041000033",
    publishedAt: new Date("2021-07-14T00:00:00.000Z"),
    inventoryQuantity: 13,
    isFeatured: false,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 67,
    shortDescription:
      "Cuốn sách nổi bật về growth mindset, học hỏi qua sai lầm và cách phát triển bền vững từ bên trong.",
    description:
      "Phù hợp cho cả kỹ năng sống lẫn tâm lý học, đồng thời tạo thêm cụm recommendation chất lượng cho self-growth.",
    keywords: ["growth mindset", "học hỏi", "phát triển bản thân"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người trẻ",
    },
    categories: [
      { slug: "tam-ly-hoc", isPrimary: true },
      { slug: "ky-nang-song" },
    ],
    collections: ["tu-duy-va-ra-quyet-dinh"],
  },
  {
    slug: "nghe-thuat-tinh-te-cua-viec-dech-quan-tam",
    title: "Nghệ Thuật Tinh Tế Của Việc Đếch Quan Tâm",
    authorSlug: "mark-manson",
    publisherSlug: "az-viet-nam",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 136000,
    compareAtAmount: 152000,
    shippingFeeAmount: 30000,
    pageCount: 272,
    languageCode: "vi",
    isbn: "9786041000034",
    publishedAt: new Date("2020-11-22T00:00:00.000Z"),
    inventoryQuantity: 6,
    isFeatured: false,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 64,
    shortDescription:
      "Một cuốn sách thẳng thắn về việc chọn điều gì thực sự đáng để quan tâm trong cuộc sống.",
    description:
      "Tựa sách phù hợp để làm giàu search tiếng Việt có dấu, recommendation chữa lành và nhóm độc giả trẻ.",
    keywords: ["giá trị sống", "tâm lý", "trưởng thành"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người trẻ",
    },
    categories: [
      { slug: "ky-nang-song", isPrimary: true },
      { slug: "tam-ly-hoc" },
    ],
    collections: ["song-cham-va-chua-lanh"],
  },
  {
    slug: "tam-ly-hoc-ve-tien",
    title: "Tâm Lý Học Về Tiền",
    authorSlug: "morgan-housel",
    publisherSlug: "alphabooks",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 156000,
    compareAtAmount: 178000,
    shippingFeeAmount: 30000,
    pageCount: 264,
    languageCode: "vi",
    isbn: "9786041000035",
    publishedAt: new Date("2023-01-09T00:00:00.000Z"),
    inventoryQuantity: 10,
    isFeatured: true,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 77,
    shortDescription:
      "Một cuốn sách dễ đọc về cách con người ra quyết định tài chính không chỉ bằng logic mà còn bằng cảm xúc.",
    description:
      "Dữ liệu này giúp nhóm kinh doanh có thêm một đầu sách rất mạnh về search, filter giá và recommendation theo hành vi.",
    keywords: ["tài chính", "hành vi", "ra quyết định"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người đi làm",
    },
    categories: [
      { slug: "kinh-doanh", isPrimary: true },
      { slug: "tam-ly-hoc" },
    ],
    collections: ["tu-duy-va-ra-quyet-dinh"],
  },
  {
    slug: "suc-manh-cua-thoi-quen",
    title: "Sức Mạnh Của Thói Quen",
    authorSlug: "charles-duhigg",
    publisherSlug: "alphabooks",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 162000,
    compareAtAmount: 184000,
    shippingFeeAmount: 30000,
    pageCount: 356,
    languageCode: "vi",
    isbn: "9786041000036",
    publishedAt: new Date("2022-04-12T00:00:00.000Z"),
    inventoryQuantity: 8,
    isFeatured: false,
    isBestseller: true,
    isRecommended: true,
    sortWeight: 69,
    shortDescription:
      "Một cuốn sách giúp hiểu rõ hơn cách thói quen được tạo ra và cách thay đổi hành vi một cách thực tế.",
    description:
      "Dữ liệu bổ trợ rất tốt cho cụm sách về thói quen bên cạnh Atomic Habits, giúp search/suggestion tự nhiên hơn.",
    keywords: ["thói quen", "hành vi", "năng suất"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người đi làm",
    },
    categories: [
      { slug: "ky-nang-song", isPrimary: true },
      { slug: "tam-ly-hoc" },
    ],
    collections: ["song-toi-uu-moi-ngay", "tu-duy-va-ra-quyet-dinh"],
  },
  {
    slug: "deep-work",
    title: "Deep Work",
    subtitle: "Làm Ra Làm, Chơi Ra Chơi",
    authorSlug: "cal-newport",
    publisherSlug: "thai-ha-books",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 168000,
    compareAtAmount: 189000,
    shippingFeeAmount: 30000,
    pageCount: 336,
    languageCode: "vi",
    isbn: "9786041000037",
    publishedAt: new Date("2021-12-02T00:00:00.000Z"),
    inventoryQuantity: 7,
    isFeatured: false,
    isBestseller: false,
    isRecommended: true,
    sortWeight: 63,
    shortDescription:
      "Tựa sách về tập trung sâu, lao động tri thức chất lượng cao và cách thoát khỏi xao nhãng kéo dài.",
    description:
      "Bổ sung thêm độ dày cho nhóm productivity và tạo vùng search rất hữu ích cho độc giả thiên về hiệu suất làm việc.",
    keywords: ["tập trung", "năng suất", "deep work"],
    metadata: {
      format: "Bìa mềm",
      audience: "Người đi làm",
    },
    categories: [
      { slug: "ky-nang-song", isPrimary: true },
      { slug: "kinh-doanh" },
    ],
    collections: ["song-toi-uu-moi-ngay"],
  },
  {
    slug: "99-ngay-song-toi-gian",
    title: "99 Ngày Sống Tối Giản",
    authorSlug: "shunmyo-masuno",
    publisherSlug: "az-viet-nam",
    publishStatus: PublishStatus.PUBLISHED,
    availabilityStatus: AvailabilityStatus.IN_STOCK,
    priceAmount: 122000,
    compareAtAmount: 138000,
    shippingFeeAmount: 25000,
    pageCount: 216,
    languageCode: "vi",
    isbn: "9786041000038",
    publishedAt: new Date("2023-03-01T00:00:00.000Z"),
    inventoryQuantity: 15,
    isFeatured: false,
    isBestseller: false,
    isRecommended: true,
    sortWeight: 61,
    shortDescription:
      "Một cuốn sách nhẹ nhàng về sống tối giản, lược bớt nhiễu động và chăm sóc nếp sống tinh thần mỗi ngày.",
    description:
      "Tựa sách rất phù hợp để làm giàu nhóm chữa lành, sống chậm và recommendation theo mood đọc sách.",
    keywords: ["sống tối giản", "chữa lành", "sống chậm"],
    metadata: {
      format: "Bìa mềm",
      audience: "Mọi lứa tuổi",
    },
    categories: [{ slug: "ky-nang-song", isPrimary: true }],
    collections: ["song-cham-va-chua-lanh"],
  },
] as const;

function getOrThrow<T>(value: T | null | undefined, label: string): T {
  if (!value) {
    throw new Error(`Missing seed dependency: ${label}`);
  }

  return value;
}

async function main() {
  const prisma = await getPrismaClient();

  const [adminPasswordHash, customerPasswordHash] = await Promise.all([
    hashPassword("Admin@123456"),
    hashPassword("Customer@123456"),
  ]);

  const authorBySlug = new Map<string, { id: string; name: string }>();
  for (const seed of authorSeeds) {
    const author = await prisma.author.upsert({
      where: { slug: seed.slug },
      update: {
        name: seed.name,
        biography: seed.biography,
      },
      create: {
        slug: seed.slug,
        name: seed.name,
        biography: seed.biography,
      },
    });
    authorBySlug.set(seed.slug, { id: author.id, name: author.name });
  }

  const publisherBySlug = new Map<string, { id: string; name: string }>();
  for (const seed of publisherSeeds) {
    const publisher = await prisma.publisher.upsert({
      where: { slug: seed.slug },
      update: {
        name: seed.name,
        description: seed.description,
      },
      create: {
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
      },
    });
    publisherBySlug.set(seed.slug, { id: publisher.id, name: publisher.name });
  }

  const categoryBySlug = new Map<string, { id: string; name: string }>();
  for (const seed of categorySeeds) {
    const category = await prisma.category.upsert({
      where: { slug: seed.slug },
      update: {
        name: seed.name,
        description: seed.description,
        isFeatured: seed.isFeatured,
        sortOrder: seed.sortOrder,
      },
      create: {
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        isFeatured: seed.isFeatured,
        sortOrder: seed.sortOrder,
      },
    });
    categoryBySlug.set(seed.slug, { id: category.id, name: category.name });
  }

  const collectionBySlug = new Map<string, { id: string; name: string }>();
  for (const seed of collectionSeeds) {
    const collection = await prisma.collection.upsert({
      where: { slug: seed.slug },
      update: {
        name: seed.name,
        description: seed.description,
        publishStatus: seed.publishStatus,
        isFeatured: seed.isFeatured,
        sortOrder: seed.sortOrder,
      },
      create: {
        slug: seed.slug,
        name: seed.name,
        description: seed.description,
        publishStatus: seed.publishStatus,
        isFeatured: seed.isFeatured,
        sortOrder: seed.sortOrder,
      },
    });
    collectionBySlug.set(seed.slug, { id: collection.id, name: collection.name });
  }

  const bookBySlug = new Map<
    string,
    {
      id: string;
      slug: string;
      title: string;
      keywords: string[];
      availabilityStatus: AvailabilityStatus;
    }
  >();

  for (const seed of bookSeeds) {
    const author = getOrThrow(authorBySlug.get(seed.authorSlug), `author ${seed.authorSlug}`);
    const publisher = getOrThrow(
      publisherBySlug.get(seed.publisherSlug),
      `publisher ${seed.publisherSlug}`,
    );

    const book = await prisma.book.upsert({
      where: { slug: seed.slug },
      update: {
        title: seed.title,
        subtitle: "subtitle" in seed ? (seed.subtitle ?? null) : null,
        shortDescription: seed.shortDescription,
        description: seed.description,
        authorId: author.id,
        publisherId: publisher.id,
        publishStatus: seed.publishStatus,
        availabilityStatus: seed.availabilityStatus,
        priceAmount: seed.priceAmount,
        compareAtAmount: seed.compareAtAmount,
        shippingFeeAmount: seed.shippingFeeAmount,
        currency: CurrencyCode.VND,
        pageCount: seed.pageCount,
        languageCode: seed.languageCode,
        isbn: seed.isbn,
        publishedAt: seed.publishedAt,
        inventoryQuantity: seed.inventoryQuantity,
        isFeatured: seed.isFeatured,
        isBestseller: seed.isBestseller,
        isRecommended: seed.isRecommended,
        sortWeight: seed.sortWeight,
        keywords: [...seed.keywords],
        metadata: seed.metadata,
      },
      create: {
        slug: seed.slug,
        title: seed.title,
        subtitle: "subtitle" in seed ? (seed.subtitle ?? null) : null,
        shortDescription: seed.shortDescription,
        description: seed.description,
        authorId: author.id,
        publisherId: publisher.id,
        publishStatus: seed.publishStatus,
        availabilityStatus: seed.availabilityStatus,
        priceAmount: seed.priceAmount,
        compareAtAmount: seed.compareAtAmount,
        shippingFeeAmount: seed.shippingFeeAmount,
        currency: CurrencyCode.VND,
        pageCount: seed.pageCount,
        languageCode: seed.languageCode,
        isbn: seed.isbn,
        publishedAt: seed.publishedAt,
        inventoryQuantity: seed.inventoryQuantity,
        isFeatured: seed.isFeatured,
        isBestseller: seed.isBestseller,
        isRecommended: seed.isRecommended,
        sortWeight: seed.sortWeight,
        keywords: [...seed.keywords],
        metadata: seed.metadata,
      },
    });

    bookBySlug.set(seed.slug, {
      id: book.id,
      slug: book.slug,
      title: book.title,
      keywords: [...seed.keywords],
      availabilityStatus: seed.availabilityStatus,
    });
  }

  const managedBookIds = Array.from(bookBySlug.values()).map((item) => item.id);
  const managedCollectionIds = Array.from(collectionBySlug.values()).map((item) => item.id);

  await prisma.bookCategory.deleteMany({
    where: {
      bookId: {
        in: managedBookIds,
      },
    },
  });

  await prisma.bookCategory.createMany({
    data: bookSeeds.flatMap((seed) =>
      seed.categories.map((category, index) => ({
        bookId: getOrThrow(bookBySlug.get(seed.slug), `book ${seed.slug}`).id,
        categoryId: getOrThrow(categoryBySlug.get(category.slug), `category ${category.slug}`).id,
        isPrimary: "isPrimary" in category ? category.isPrimary === true : false,
        position: index + 1,
      })),
    ),
  });

  await prisma.collectionItem.deleteMany({
    where: {
      collectionId: {
        in: managedCollectionIds,
      },
    },
  });

  const collectionPositions = new Map<string, number>();
  const collectionItems = bookSeeds.flatMap((seed) =>
    seed.collections.map((collectionSlug) => {
      const nextPosition = (collectionPositions.get(collectionSlug) ?? 0) + 1;
      collectionPositions.set(collectionSlug, nextPosition);

      return {
        collectionId: getOrThrow(collectionBySlug.get(collectionSlug), `collection ${collectionSlug}`)
          .id,
        bookId: getOrThrow(bookBySlug.get(seed.slug), `book ${seed.slug}`).id,
        position: nextPosition,
      };
    }),
  );

  await prisma.collectionItem.createMany({
    data: collectionItems,
    skipDuplicates: true,
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@bookverse.local" },
    update: {
      fullName: "Quản trị viên Bookverse",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      permissions: [
        AdminPermission.CATALOG_MANAGE,
        AdminPermission.CONTENT_REVIEW,
        AdminPermission.ORDER_MANAGE,
        AdminPermission.ANALYTICS_VIEW,
      ],
      isActive: true,
    },
    create: {
      email: "admin@bookverse.local",
      fullName: "Quản trị viên Bookverse",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      permissions: [
        AdminPermission.CATALOG_MANAGE,
        AdminPermission.CONTENT_REVIEW,
        AdminPermission.ORDER_MANAGE,
        AdminPermission.ANALYTICS_VIEW,
      ],
      isActive: true,
    },
  });

  const customerUser = await prisma.user.upsert({
    where: { email: "customer@bookverse.local" },
    update: {
      fullName: "Lê Thị Độc Giả",
      passwordHash: customerPasswordHash,
      role: UserRole.CUSTOMER,
      permissions: [],
      isActive: true,
    },
    create: {
      email: "customer@bookverse.local",
      fullName: "Lê Thị Độc Giả",
      passwordHash: customerPasswordHash,
      role: UserRole.CUSTOMER,
      permissions: [],
      isActive: true,
    },
  });

  const seededCartItems = [
    {
      id: "seed-cart-item-1",
      bookSlug: "mat-biec",
      quantity: 1,
      unitPriceAmount: 98000,
      compareAtAmount: 115000,
      shippingFeeAmount: 0,
      lineSubtotalAmount: 98000,
      lineTotalAmount: 98000,
    },
    {
      id: "seed-cart-item-2",
      bookSlug: "atomic-habits",
      quantity: 1,
      unitPriceAmount: 172000,
      compareAtAmount: 199000,
      shippingFeeAmount: 30000,
      lineSubtotalAmount: 172000,
      lineTotalAmount: 202000,
    },
  ] as const;

  const seededCartSubtotal = seededCartItems.reduce((sum, item) => sum + item.lineSubtotalAmount, 0);
  const seededCartShipping = Math.max(...seededCartItems.map((item) => item.shippingFeeAmount));
  const seededCartTotal = seededCartSubtotal + seededCartShipping;

  const devCart = await prisma.cart.upsert({
    where: { id: "dev-cart-seed-main" },
    update: {
      userId: customerUser.id,
      sessionId: "dev-session-customer",
      itemCount: seededCartItems.length,
      subtotalAmount: seededCartSubtotal,
      shippingFeeAmount: seededCartShipping,
      totalAmount: seededCartTotal,
      isActive: false,
    },
    create: {
      id: "dev-cart-seed-main",
      userId: customerUser.id,
      sessionId: "dev-session-customer",
      currency: CurrencyCode.VND,
      itemCount: seededCartItems.length,
      subtotalAmount: seededCartSubtotal,
      shippingFeeAmount: seededCartShipping,
      totalAmount: seededCartTotal,
      isActive: false,
      checkedOutAt: new Date("2026-05-04T09:15:00.000Z"),
      lastActivityAt: new Date("2026-05-04T09:10:00.000Z"),
    },
  });

  await prisma.cartItem.deleteMany({
    where: {
      cartId: devCart.id,
    },
  });

  await prisma.cartItem.createMany({
    data: seededCartItems.map((item) => ({
      id: item.id,
      cartId: devCart.id,
      bookId: getOrThrow(bookBySlug.get(item.bookSlug), `book ${item.bookSlug}`).id,
      quantity: item.quantity,
      unitPriceAmount: item.unitPriceAmount,
      compareAtAmount: item.compareAtAmount,
      shippingFeeAmount: item.shippingFeeAmount,
      lineSubtotalAmount: item.lineSubtotalAmount,
      lineTotalAmount: item.lineTotalAmount,
      currency: CurrencyCode.VND,
    })),
    skipDuplicates: true,
  });

  const checkoutAttempt = await prisma.checkoutAttempt.upsert({
    where: { id: "dev-checkout-attempt-1" },
    update: {
      cartId: devCart.id,
      userId: customerUser.id,
      sessionId: "dev-session-customer",
      status: CheckoutAttemptStatus.COMPLETED,
      shippingFullName: "Lê Thị Độc Giả",
      shippingPhoneNumber: "0901234567",
      shippingAddressLine1: "12 Nguyễn Trãi",
      shippingWard: "Phường Bến Thành",
      shippingDistrict: "Quận 1",
      shippingProvince: "TP. Hồ Chí Minh",
      shippingNote: "Giao trong giờ hành chính",
      paymentMethod: PaymentMethodCode.BANK_TRANSFER,
      subtotalAmount: seededCartSubtotal,
      shippingFeeAmount: seededCartShipping,
      totalAmount: seededCartTotal,
      startedAt: new Date("2026-05-04T09:11:00.000Z"),
      shippingInfoSubmittedAt: new Date("2026-05-04T09:12:00.000Z"),
      paymentMethodSelectedAt: new Date("2026-05-04T09:13:00.000Z"),
      completedAt: new Date("2026-05-04T09:15:00.000Z"),
    },
    create: {
      id: "dev-checkout-attempt-1",
      cartId: devCart.id,
      userId: customerUser.id,
      sessionId: "dev-session-customer",
      status: CheckoutAttemptStatus.COMPLETED,
      shippingFullName: "Lê Thị Độc Giả",
      shippingPhoneNumber: "0901234567",
      shippingAddressLine1: "12 Nguyễn Trãi",
      shippingWard: "Phường Bến Thành",
      shippingDistrict: "Quận 1",
      shippingProvince: "TP. Hồ Chí Minh",
      shippingNote: "Giao trong giờ hành chính",
      paymentMethod: PaymentMethodCode.BANK_TRANSFER,
      currency: CurrencyCode.VND,
      subtotalAmount: seededCartSubtotal,
      shippingFeeAmount: seededCartShipping,
      totalAmount: seededCartTotal,
      startedAt: new Date("2026-05-04T09:11:00.000Z"),
      shippingInfoSubmittedAt: new Date("2026-05-04T09:12:00.000Z"),
      paymentMethodSelectedAt: new Date("2026-05-04T09:13:00.000Z"),
      completedAt: new Date("2026-05-04T09:15:00.000Z"),
    },
  });

  const seededOrder = await prisma.order.upsert({
    where: { orderNumber: "ORD-20260504-0001" },
    update: {
      idempotencyKey: "seed-order-ord-20260504-0001",
      userId: customerUser.id,
      sourceCartId: devCart.id,
      checkoutAttemptId: checkoutAttempt.id,
      sessionId: "dev-session-customer",
      status: OrderStatus.AWAITING_TRANSFER,
      paymentStatus: PaymentStatus.AWAITING_VERIFICATION,
      paymentMethod: PaymentMethodCode.BANK_TRANSFER,
      currency: CurrencyCode.VND,
      itemCount: seededCartItems.length,
      subtotalAmount: seededCartSubtotal,
      shippingFeeAmount: seededCartShipping,
      totalAmount: seededCartTotal,
      customerEmail: customerUser.email,
      customerFullName: "Lê Thị Độc Giả",
      customerPhoneNumber: "0901234567",
      placedAt: new Date("2026-05-04T09:15:00.000Z"),
    },
    create: {
      orderNumber: "ORD-20260504-0001",
      idempotencyKey: "seed-order-ord-20260504-0001",
      userId: customerUser.id,
      sourceCartId: devCart.id,
      checkoutAttemptId: checkoutAttempt.id,
      sessionId: "dev-session-customer",
      status: OrderStatus.AWAITING_TRANSFER,
      paymentStatus: PaymentStatus.AWAITING_VERIFICATION,
      paymentMethod: PaymentMethodCode.BANK_TRANSFER,
      currency: CurrencyCode.VND,
      itemCount: seededCartItems.length,
      subtotalAmount: seededCartSubtotal,
      shippingFeeAmount: seededCartShipping,
      totalAmount: seededCartTotal,
      customerEmail: customerUser.email,
      customerFullName: "Lê Thị Độc Giả",
      customerPhoneNumber: "0901234567",
      placedAt: new Date("2026-05-04T09:15:00.000Z"),
    },
  });

  await prisma.orderAddress.upsert({
    where: { orderId: seededOrder.id },
    update: {
      recipientName: "Lê Thị Độc Giả",
      phoneNumber: "0901234567",
      addressLine1: "12 Nguyễn Trãi",
      ward: "Phường Bến Thành",
      district: "Quận 1",
      province: "TP. Hồ Chí Minh",
      note: "Giao trong giờ hành chính",
    },
    create: {
      orderId: seededOrder.id,
      recipientName: "Lê Thị Độc Giả",
      phoneNumber: "0901234567",
      addressLine1: "12 Nguyễn Trãi",
      ward: "Phường Bến Thành",
      district: "Quận 1",
      province: "TP. Hồ Chí Minh",
      note: "Giao trong giờ hành chính",
    },
  });

  const [orderItem1, orderItem2] = await Promise.all([
    prisma.orderItem.upsert({
      where: { id: "seed-order-item-1" },
      update: {
        orderId: seededOrder.id,
        bookId: getOrThrow(bookBySlug.get("mat-biec"), "book mat-biec").id,
        bookSlug: "mat-biec",
        bookTitle: getOrThrow(bookBySlug.get("mat-biec"), "book mat-biec").title,
        authorName: getOrThrow(authorBySlug.get("nguyen-nhat-anh"), "author nguyen-nhat-anh").name,
        publisherName: getOrThrow(publisherBySlug.get("nxb-tre"), "publisher nxb-tre").name,
        quantity: 1,
        unitPriceAmount: 98000,
        compareAtAmount: 115000,
        shippingFeeAmount: 0,
        lineSubtotalAmount: 98000,
        lineTotalAmount: 98000,
        currency: CurrencyCode.VND,
        snapshotMetadata: {
          keywords: getOrThrow(bookBySlug.get("mat-biec"), "book mat-biec").keywords,
          availabilityStatus: getOrThrow(bookBySlug.get("mat-biec"), "book mat-biec")
            .availabilityStatus,
        },
      },
      create: {
        id: "seed-order-item-1",
        orderId: seededOrder.id,
        bookId: getOrThrow(bookBySlug.get("mat-biec"), "book mat-biec").id,
        bookSlug: "mat-biec",
        bookTitle: getOrThrow(bookBySlug.get("mat-biec"), "book mat-biec").title,
        authorName: getOrThrow(authorBySlug.get("nguyen-nhat-anh"), "author nguyen-nhat-anh").name,
        publisherName: getOrThrow(publisherBySlug.get("nxb-tre"), "publisher nxb-tre").name,
        quantity: 1,
        unitPriceAmount: 98000,
        compareAtAmount: 115000,
        shippingFeeAmount: 0,
        lineSubtotalAmount: 98000,
        lineTotalAmount: 98000,
        currency: CurrencyCode.VND,
        snapshotMetadata: {
          keywords: getOrThrow(bookBySlug.get("mat-biec"), "book mat-biec").keywords,
          availabilityStatus: getOrThrow(bookBySlug.get("mat-biec"), "book mat-biec")
            .availabilityStatus,
        },
      },
    }),
    prisma.orderItem.upsert({
      where: { id: "seed-order-item-2" },
      update: {
        orderId: seededOrder.id,
        bookId: getOrThrow(bookBySlug.get("atomic-habits"), "book atomic-habits").id,
        bookSlug: "atomic-habits",
        bookTitle: getOrThrow(bookBySlug.get("atomic-habits"), "book atomic-habits").title,
        authorName: getOrThrow(authorBySlug.get("james-clear"), "author james-clear").name,
        publisherName: getOrThrow(publisherBySlug.get("alphabooks"), "publisher alphabooks").name,
        quantity: 1,
        unitPriceAmount: 172000,
        compareAtAmount: 199000,
        shippingFeeAmount: 30000,
        lineSubtotalAmount: 172000,
        lineTotalAmount: 202000,
        currency: CurrencyCode.VND,
        snapshotMetadata: {
          keywords: getOrThrow(bookBySlug.get("atomic-habits"), "book atomic-habits").keywords,
          availabilityStatus: getOrThrow(bookBySlug.get("atomic-habits"), "book atomic-habits")
            .availabilityStatus,
        },
      },
      create: {
        id: "seed-order-item-2",
        orderId: seededOrder.id,
        bookId: getOrThrow(bookBySlug.get("atomic-habits"), "book atomic-habits").id,
        bookSlug: "atomic-habits",
        bookTitle: getOrThrow(bookBySlug.get("atomic-habits"), "book atomic-habits").title,
        authorName: getOrThrow(authorBySlug.get("james-clear"), "author james-clear").name,
        publisherName: getOrThrow(publisherBySlug.get("alphabooks"), "publisher alphabooks").name,
        quantity: 1,
        unitPriceAmount: 172000,
        compareAtAmount: 199000,
        shippingFeeAmount: 30000,
        lineSubtotalAmount: 172000,
        lineTotalAmount: 202000,
        currency: CurrencyCode.VND,
        snapshotMetadata: {
          keywords: getOrThrow(bookBySlug.get("atomic-habits"), "book atomic-habits").keywords,
          availabilityStatus: getOrThrow(bookBySlug.get("atomic-habits"), "book atomic-habits")
            .availabilityStatus,
        },
      },
    }),
  ]);

  await prisma.paymentRecord.upsert({
    where: { id: "seed-payment-record-1" },
    update: {
      orderId: seededOrder.id,
      status: PaymentStatus.AWAITING_VERIFICATION,
      method: PaymentMethodCode.BANK_TRANSFER,
      amount: seededCartTotal,
      currency: CurrencyCode.VND,
      attemptNumber: 1,
      externalReference: "BANKTXN-SEED-0001",
      note: "Chờ quản trị viên xác nhận giao dịch chuyển khoản.",
    },
    create: {
      id: "seed-payment-record-1",
      orderId: seededOrder.id,
      status: PaymentStatus.AWAITING_VERIFICATION,
      method: PaymentMethodCode.BANK_TRANSFER,
      amount: seededCartTotal,
      currency: CurrencyCode.VND,
      attemptNumber: 1,
      externalReference: "BANKTXN-SEED-0001",
      note: "Chờ quản trị viên xác nhận giao dịch chuyển khoản.",
    },
  });

  const importJob = await prisma.contentImportJob.upsert({
    where: { id: "seed-import-job-1" },
    update: {
      source: "crawler",
      sourceReference: "crawl-2026-05-04",
      triggeredByUserId: adminUser.id,
      status: ContentImportJobStatus.PARTIAL_SUCCESS,
      totalRecords: 3,
      processedRecords: 3,
      successfulRecords: 2,
      failedRecords: 1,
      startedAt: new Date("2026-05-04T08:00:00.000Z"),
      completedAt: new Date("2026-05-04T08:05:00.000Z"),
      errorSummary: "Một bản ghi thiếu ISBN và cần bổ sung metadata trước khi xuất bản.",
    },
    create: {
      id: "seed-import-job-1",
      source: "crawler",
      sourceReference: "crawl-2026-05-04",
      triggeredByUserId: adminUser.id,
      status: ContentImportJobStatus.PARTIAL_SUCCESS,
      totalRecords: 3,
      processedRecords: 3,
      successfulRecords: 2,
      failedRecords: 1,
      startedAt: new Date("2026-05-04T08:00:00.000Z"),
      completedAt: new Date("2026-05-04T08:05:00.000Z"),
      errorSummary: "Một bản ghi thiếu ISBN và cần bổ sung metadata trước khi xuất bản.",
    },
  });

  await prisma.stagedBook.upsert({
    where: { id: "seed-staged-book-1" },
    update: {
      importJobId: importJob.id,
      reviewerUserId: adminUser.id,
      mappedBookId: getOrThrow(bookBySlug.get("nha-gia-kim"), "book nha-gia-kim").id,
      sourceRecordId: "crawl-item-nha-gia-kim",
      sourceUrl: "https://example.com/books/nha-gia-kim",
      status: StagedBookStatus.APPROVED,
      title: "Nhà Giả Kim",
      authorName: getOrThrow(authorBySlug.get("paulo-coelho"), "author paulo-coelho").name,
      publisherName: getOrThrow(publisherBySlug.get("nha-nam"), "publisher nha-nam").name,
      isbn: "9786041000019",
      priceAmount: 99000,
      compareAtAmount: 118000,
      shortDescription: "Bản ghi staging đã được chuẩn hóa và sẵn sàng đưa lên storefront.",
      description:
        "Dữ liệu staging này giúp mô phỏng quy trình crawl -> review -> publish trong môi trường phát triển.",
      keywords: ["chiêm nghiệm", "hành trình", "truyền cảm hứng"],
      reviewedAt: new Date("2026-05-04T08:04:00.000Z"),
      rawPayload: { title: "Nhà Giả Kim", source: "crawler" },
      normalizedPayload: {
        slug: "nha-gia-kim",
        mappedBookId: getOrThrow(bookBySlug.get("nha-gia-kim"), "book nha-gia-kim").id,
      },
    },
    create: {
      id: "seed-staged-book-1",
      importJobId: importJob.id,
      reviewerUserId: adminUser.id,
      mappedBookId: getOrThrow(bookBySlug.get("nha-gia-kim"), "book nha-gia-kim").id,
      sourceRecordId: "crawl-item-nha-gia-kim",
      sourceUrl: "https://example.com/books/nha-gia-kim",
      status: StagedBookStatus.APPROVED,
      title: "Nhà Giả Kim",
      authorName: getOrThrow(authorBySlug.get("paulo-coelho"), "author paulo-coelho").name,
      publisherName: getOrThrow(publisherBySlug.get("nha-nam"), "publisher nha-nam").name,
      isbn: "9786041000019",
      priceAmount: 99000,
      compareAtAmount: 118000,
      shortDescription: "Bản ghi staging đã được chuẩn hóa và sẵn sàng đưa lên storefront.",
      description:
        "Dữ liệu staging này giúp mô phỏng quy trình crawl -> review -> publish trong môi trường phát triển.",
      keywords: ["chiêm nghiệm", "hành trình", "truyền cảm hứng"],
      reviewedAt: new Date("2026-05-04T08:04:00.000Z"),
      rawPayload: { title: "Nhà Giả Kim", source: "crawler" },
      normalizedPayload: {
        slug: "nha-gia-kim",
        mappedBookId: getOrThrow(bookBySlug.get("nha-gia-kim"), "book nha-gia-kim").id,
      },
    },
  });

  await prisma.analyticsEventOutbox.createMany({
    data: [
      {
        id: "seed-outbox-session-start",
        dedupeKey: "seed:session_start:dev-session-customer",
        eventName: AnalyticsEventName.SESSION_START,
        deliveryStatus: AnalyticsDeliveryStatus.DELIVERED,
        sourceModule: "analytics",
        sessionId: "dev-session-customer",
        userId: customerUser.id,
        isCritical: false,
        occurredAt: new Date("2026-05-04T09:00:00.000Z"),
        payload: {
          entryPath: "/",
          deviceType: "desktop",
        },
        attemptCount: 1,
        deliveredAt: new Date("2026-05-04T09:00:01.000Z"),
      },
      {
        id: "seed-outbox-purchase",
        dedupeKey: "seed:purchase:ORD-20260504-0001",
        eventName: AnalyticsEventName.PURCHASE,
        deliveryStatus: AnalyticsDeliveryStatus.PENDING,
        sourceModule: "checkout",
        sessionId: "dev-session-customer",
        cartId: devCart.id,
        orderId: seededOrder.id,
        userId: customerUser.id,
        isCritical: true,
        occurredAt: new Date("2026-05-04T09:15:00.000Z"),
        payload: {
          orderNumber: seededOrder.orderNumber,
          totalAmount: seededOrder.totalAmount,
          paymentMethod: seededOrder.paymentMethod,
        },
        attemptCount: 0,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.factSession.upsert({
    where: { sessionId: "dev-session-customer" },
    update: {
      userId: customerUser.id,
      isLoggedIn: true,
      deviceType: "desktop",
      landingPath: "/",
      referrer: "direct",
      startedAt: new Date("2026-05-04T09:00:00.000Z"),
      lastSeenAt: new Date("2026-05-04T09:15:00.000Z"),
      pageViewCount: 8,
      searchCount: 2,
      cartEventCount: 3,
      checkoutCount: 3,
      purchaseCount: 1,
    },
    create: {
      sessionId: "dev-session-customer",
      userId: customerUser.id,
      isLoggedIn: true,
      deviceType: "desktop",
      landingPath: "/",
      referrer: "direct",
      startedAt: new Date("2026-05-04T09:00:00.000Z"),
      lastSeenAt: new Date("2026-05-04T09:15:00.000Z"),
      pageViewCount: 8,
      searchCount: 2,
      cartEventCount: 3,
      checkoutCount: 3,
      purchaseCount: 1,
    },
  });

  await prisma.factSearch.upsert({
    where: { id: "seed-fact-search-1" },
    update: {
      sessionId: "dev-session-customer",
      userId: customerUser.id,
      bookId: getOrThrow(bookBySlug.get("mat-biec"), "book mat-biec").id,
      query: "mat biec",
      normalizedQuery: "mat biec",
      resultCount: 1,
      noResult: false,
      selectedRank: 1,
      occurredAt: new Date("2026-05-04T09:02:00.000Z"),
    },
    create: {
      id: "seed-fact-search-1",
      sessionId: "dev-session-customer",
      userId: customerUser.id,
      bookId: getOrThrow(bookBySlug.get("mat-biec"), "book mat-biec").id,
      query: "mat biec",
      normalizedQuery: "mat biec",
      resultCount: 1,
      noResult: false,
      selectedRank: 1,
      occurredAt: new Date("2026-05-04T09:02:00.000Z"),
    },
  });

  await prisma.factProductView.deleteMany({
    where: {
      id: {
        in: ["seed-fact-product-view-1", "seed-fact-product-view-2"],
      },
    },
  });

  await prisma.factProductView.createMany({
    data: [
      {
        id: "seed-fact-product-view-1",
        sessionId: "dev-session-customer",
        userId: customerUser.id,
        bookId: getOrThrow(bookBySlug.get("mat-biec"), "book mat-biec").id,
        categoryId: getOrThrow(categoryBySlug.get("van-hoc"), "category van-hoc").id,
        collectionId: getOrThrow(collectionBySlug.get("tuan-le-doc-sach"), "collection tuan-le-doc-sach")
          .id,
        sourceContext: "homepage",
        occurredAt: new Date("2026-05-04T09:01:00.000Z"),
      },
      {
        id: "seed-fact-product-view-2",
        sessionId: "dev-session-customer",
        userId: customerUser.id,
        bookId: getOrThrow(bookBySlug.get("atomic-habits"), "book atomic-habits").id,
        categoryId: getOrThrow(categoryBySlug.get("ky-nang-song"), "category ky-nang-song").id,
        collectionId: getOrThrow(
          collectionBySlug.get("song-toi-uu-moi-ngay"),
          "collection song-toi-uu-moi-ngay",
        ).id,
        sourceContext: "collection",
        occurredAt: new Date("2026-05-04T09:03:00.000Z"),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.factCartEvent.deleteMany({
    where: {
      id: {
        in: ["seed-fact-cart-add-1", "seed-fact-cart-add-2", "seed-fact-cart-view-1"],
      },
    },
  });

  await prisma.factCartEvent.createMany({
    data: [
      {
        id: "seed-fact-cart-add-1",
        sessionId: "dev-session-customer",
        userId: customerUser.id,
        cartId: devCart.id,
        bookId: getOrThrow(bookBySlug.get("mat-biec"), "book mat-biec").id,
        eventName: AnalyticsEventName.ADD_TO_CART,
        quantity: 1,
        subtotalAmount: 98000,
        totalAmount: 98000,
        occurredAt: new Date("2026-05-04T09:05:00.000Z"),
      },
      {
        id: "seed-fact-cart-add-2",
        sessionId: "dev-session-customer",
        userId: customerUser.id,
        cartId: devCart.id,
        bookId: getOrThrow(bookBySlug.get("atomic-habits"), "book atomic-habits").id,
        eventName: AnalyticsEventName.ADD_TO_CART,
        quantity: 1,
        subtotalAmount: 172000,
        totalAmount: 202000,
        occurredAt: new Date("2026-05-04T09:06:00.000Z"),
      },
      {
        id: "seed-fact-cart-view-1",
        sessionId: "dev-session-customer",
        userId: customerUser.id,
        cartId: devCart.id,
        eventName: AnalyticsEventName.VIEW_CART,
        subtotalAmount: seededCartSubtotal,
        totalAmount: seededCartTotal,
        occurredAt: new Date("2026-05-04T09:09:00.000Z"),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.factCheckoutEvent.deleteMany({
    where: {
      id: {
        in: [
          "seed-fact-checkout-begin",
          "seed-fact-checkout-payment",
          "seed-fact-checkout-purchase",
        ],
      },
    },
  });

  await prisma.factCheckoutEvent.createMany({
    data: [
      {
        id: "seed-fact-checkout-begin",
        sessionId: "dev-session-customer",
        userId: customerUser.id,
        orderId: seededOrder.id,
        checkoutAttemptId: checkoutAttempt.id,
        eventName: AnalyticsEventName.BEGIN_CHECKOUT,
        totalAmount: seededCartTotal,
        occurredAt: new Date("2026-05-04T09:11:00.000Z"),
      },
      {
        id: "seed-fact-checkout-payment",
        sessionId: "dev-session-customer",
        userId: customerUser.id,
        orderId: seededOrder.id,
        checkoutAttemptId: checkoutAttempt.id,
        eventName: AnalyticsEventName.SELECT_PAYMENT_METHOD,
        paymentMethod: PaymentMethodCode.BANK_TRANSFER,
        totalAmount: seededCartTotal,
        occurredAt: new Date("2026-05-04T09:13:00.000Z"),
      },
      {
        id: "seed-fact-checkout-purchase",
        sessionId: "dev-session-customer",
        userId: customerUser.id,
        orderId: seededOrder.id,
        checkoutAttemptId: checkoutAttempt.id,
        eventName: AnalyticsEventName.PURCHASE,
        paymentMethod: PaymentMethodCode.BANK_TRANSFER,
        totalAmount: seededCartTotal,
        occurredAt: new Date("2026-05-04T09:15:00.000Z"),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.factOrder.deleteMany({
    where: {
      id: {
        in: ["seed-fact-order-1", "seed-fact-order-2"],
      },
    },
  });

  await prisma.factOrder.createMany({
    data: [
      {
        id: "seed-fact-order-1",
        orderId: seededOrder.id,
        orderItemId: orderItem1.id,
        orderNumber: seededOrder.orderNumber,
        sessionId: "dev-session-customer",
        userId: customerUser.id,
        bookId: getOrThrow(bookBySlug.get("mat-biec"), "book mat-biec").id,
        categoryId: getOrThrow(categoryBySlug.get("van-hoc"), "category van-hoc").id,
        paymentMethod: PaymentMethodCode.BANK_TRANSFER,
        orderStatus: OrderStatus.AWAITING_TRANSFER,
        paymentStatus: PaymentStatus.AWAITING_VERIFICATION,
        quantity: 1,
        subtotalAmount: 98000,
        shippingFeeAmount: 0,
        totalAmount: 98000,
        currency: CurrencyCode.VND,
        isGuestOrder: false,
        orderedAt: new Date("2026-05-04T09:15:00.000Z"),
      },
      {
        id: "seed-fact-order-2",
        orderId: seededOrder.id,
        orderItemId: orderItem2.id,
        orderNumber: seededOrder.orderNumber,
        sessionId: "dev-session-customer",
        userId: customerUser.id,
        bookId: getOrThrow(bookBySlug.get("atomic-habits"), "book atomic-habits").id,
        categoryId: getOrThrow(categoryBySlug.get("ky-nang-song"), "category ky-nang-song").id,
        paymentMethod: PaymentMethodCode.BANK_TRANSFER,
        orderStatus: OrderStatus.AWAITING_TRANSFER,
        paymentStatus: PaymentStatus.AWAITING_VERIFICATION,
        quantity: 1,
        subtotalAmount: 172000,
        shippingFeeAmount: 30000,
        totalAmount: 202000,
        currency: CurrencyCode.VND,
        isGuestOrder: false,
        orderedAt: new Date("2026-05-04T09:15:00.000Z"),
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .then(async () => {
    await disconnectPrisma();
    await closePgPool();
  })
  .catch(async (error) => {
    console.error(error);
    await disconnectPrisma();
    await closePgPool();
    process.exit(1);
  });
