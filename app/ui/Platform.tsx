"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PartnerPortal } from "@/app/ui/partner/PartnerPortal";
import {
  allSearchTypes,
  normalizeSearchText,
  type SearchEntityType,
  type SearchIntent,
  type SearchRequestType,
} from "@/lib/search-governance";

type PageDef = {
  id: string;
  path: string;
  title: string;
  eyebrow: string;
  desc: string;
  kind: string;
  tags?: string[];
};
const pages: PageDef[] = [
  {
    id: "PG-001",
    path: "/",
    title: "كل ما تحتاجه للقهوة… في مكان واحد",
    eyebrow: "بغداد أولاً",
    desc: "اكتشف القهوة والمعدات والجهات الموثقة، وقارن الخيارات وتابعها داخل صفحات البائعين في قهوتنا.",
    kind: "home",
  },
  {
    id: "PG-002",
    path: "/coffee",
    title: "دليل القهوة المحمصة",
    eyebrow: "القهوة",
    desc: "قهوة فلتر وإسبريسو وأومني وتركية ببيانات واضحة تساعدك على الاختيار.",
    kind: "listing",
    tags: ["فلتر", "إسبريسو", "أومني", "تركية"],
  },
  {
    id: "PG-003",
    path: "/coffee/filter",
    title: "قهوة الفلتر",
    eyebrow: "القهوة",
    desc: "خيارات خفيفة وواضحة النكهات مناسبة لأدوات التقطير.",
    kind: "listing",
    tags: ["فاكهية", "زهرية", "متوازنة"],
  },
  {
    id: "PG-004",
    path: "/coffee/espresso",
    title: "قهوة الإسبريسو",
    eyebrow: "القهوة",
    desc: "تحميصات مناسبة للإسبريسو والمشروبات بالحليب.",
    kind: "listing",
    tags: ["شوكولاتة", "مكسرات", "فاكهية"],
  },
  {
    id: "PG-005",
    path: "/coffee/omni",
    title: "قهوة أومني",
    eyebrow: "القهوة",
    desc: "تحميصات مرنة تناسب الفلتر والإسبريسو معاً.",
    kind: "listing",
  },
  {
    id: "PG-006",
    path: "/coffee/turkish",
    title: "القهوة التركية",
    eyebrow: "القهوة",
    desc: "قهوة مطحونة بدرجة مناسبة للتحضير التركي.",
    kind: "listing",
  },
  {
    id: "PG-007",
    path: "/coffee/finder",
    title: "ساعدني أختار القهوة",
    eyebrow: "Coffee Finder",
    desc: "أربع إجابات قصيرة تنتج ترشيحات مفهومة وقابلة للتعديل.",
    kind: "finder",
  },
  {
    id: "PG-008",
    path: "/coffee/finder/results",
    title: "نتائج اختيارك",
    eyebrow: "ترشيحاتك",
    desc: "رتبنا القهوة حسب توافقها مع طريقة شربك ونكهاتك المفضلة.",
    kind: "results",
  },
  {
    id: "PG-009",
    path: "/coffee/sumer-ethiopia",
    title: "سومر — إثيوبيا قوجي",
    eyebrow: "تفاصيل القهوة",
    desc: "قهوة فلتر فاكهية، معالجة طبيعية، بإيحاءات التوت والكاكاو.",
    kind: "coffee-detail",
  },
  {
    id: "PG-010",
    path: "/coffee/sumer-ethiopia/offers",
    title: "أماكن توفر القهوة",
    eyebrow: "العروض",
    desc: "قارن البائع والسعر وتاريخ التحقق ثم افتح صفحة البائع داخل قهوتنا.",
    kind: "offers",
  },
  {
    id: "PG-011",
    path: "/equipment",
    title: "معدات القهوة",
    eyebrow: "المعدات",
    desc: "مطاحن ومكائن وأدوات تحضير ومكائن تحميص وعناية وصيانة.",
    kind: "families",
  },
  {
    id: "PG-012",
    path: "/equipment/grinders",
    title: "مطاحن القهوة",
    eyebrow: "المعدات",
    desc: "مطاحن يدوية وكهربائية للإسبريسو والفلتر والاستخدام المختلط.",
    kind: "listing",
    tags: ["يدوية", "كهربائية", "إسبريسو", "فلتر"],
  },
  {
    id: "PG-013",
    path: "/equipment/grinders/manual",
    title: "المطاحن اليدوية",
    eyebrow: "المطاحن",
    desc: "خيارات محمولة بتحكم مباشر في درجة الطحن.",
    kind: "listing",
  },
  {
    id: "PG-014",
    path: "/equipment/grinders/electric",
    title: "المطاحن الكهربائية",
    eyebrow: "المطاحن",
    desc: "مطاحن منزلية وتجارية بسرعات وأنظمة ضبط مختلفة.",
    kind: "listing",
  },
  {
    id: "PG-015",
    path: "/equipment/grinders/df54-v4",
    title: "مطحنة DF54 V4",
    eyebrow: "تفاصيل المنتج",
    desc: "مطحنة كهربائية أحادية الجرعة بشفرات مسطحة 54 مم وضبط تدريجي دون درجات.",
    kind: "product",
  },
  {
    id: "PG-016",
    path: "/equipment/brew-tools",
    title: "أدوات التحضير",
    eyebrow: "المعدات",
    desc: "قطارات وغلايات وموازين وسيرفرات وفلاتر ومؤقتات.",
    kind: "listing",
    tags: ["أدوات التقطير", "الغلايات", "الموازين", "الفلاتر", "أوعية التقديم والموقتات"],
  },
  {
    id: "PG-017",
    path: "/equipment/brew-tools/drippers",
    title: "أدوات التقطير",
    eyebrow: "أدوات التحضير",
    desc: "قارن المادة والسعة ونمط التدفق والفلتر المضمن.",
    kind: "listing",
  },
  {
    id: "PG-018",
    path: "/equipment/brew-tools/kettles",
    title: "الغلايات",
    eyebrow: "أدوات التحضير",
    desc: "غلايات عادية ومتحكمة بالحرارة للتحضير الدقيق.",
    kind: "listing",
  },
  {
    id: "PG-019",
    path: "/equipment/brew-tools/scales",
    title: "الموازين",
    eyebrow: "أدوات التحضير",
    desc: "موازين بدقة وتوقيت وسعة تناسب الاستخدام المنزلي والمهني.",
    kind: "listing",
  },
  {
    id: "PG-020",
    path: "/equipment/brew-tools/filters",
    title: "فلاتر القهوة",
    eyebrow: "أدوات التحضير",
    desc: "ورقية ومعدنية وقماشية حسب الأداة والحجم.",
    kind: "listing",
  },
  {
    id: "PG-021",
    path: "/equipment/brew-tools/servers",
    title: "أوعية التقديم",
    eyebrow: "أدوات التحضير",
    desc: "أحجام وخامات متوافقة مع أدوات التقطير.",
    kind: "listing",
  },
  {
    id: "PG-022",
    path: "/equipment/brew-tools/timers",
    title: "المؤقتات",
    eyebrow: "أدوات التحضير",
    desc: "توقيت مستقل أو مدمج لرفع اتساق التحضير.",
    kind: "listing",
  },
  {
    id: "PG-023",
    path: "/equipment/brew-machines",
    title: "مكائن تحضير القهوة",
    eyebrow: "المعدات",
    desc: "مكائن إسبريسو وتقطير وكبسولات للاستخدام المنزلي والتجاري.",
    kind: "listing",
    tags: ["إسبريسو", "قهوة مقطرة", "كبسولات"],
  },
  {
    id: "PG-024",
    path: "/equipment/brew-machines/espresso",
    title: "مكائن الإسبريسو",
    eyebrow: "مكائن التحضير",
    desc: "قارن نوع المجموعة والمرجل والتحكم والقدرة والخدمة.",
    kind: "listing",
  },
  {
    id: "PG-025",
    path: "/equipment/brew-machines/filter",
    title: "مكائن القهوة المقطرة",
    eyebrow: "مكائن التحضير",
    desc: "مكائن منزلية وتجارية بسعات وبرامج مختلفة.",
    kind: "listing",
  },
  {
    id: "PG-026",
    path: "/equipment/brew-machines/capsule",
    title: "مكائن الكبسولات",
    eyebrow: "مكائن التحضير",
    desc: "أنظمة مدمجة للاستخدام السريع مع توضيح توافق الكبسولات.",
    kind: "listing",
  },
  {
    id: "PG-027",
    path: "/equipment/roasting-machines",
    title: "مكائن التحميص",
    eyebrow: "المعدات",
    desc: "مكائن عينات ومنزلية وتجارية مع مواصفات الحرارة والطاقة والخدمة.",
    kind: "listing",
    tags: ["عينات", "منزلية", "تجارية"],
  },
  {
    id: "PG-028",
    path: "/equipment/roasting-machines/sample",
    title: "مكائن تحميص العينات",
    eyebrow: "مكائن التحميص",
    desc: "معدات صغيرة لتقييم العينات وتطوير ملفات التحميص.",
    kind: "listing",
  },
  {
    id: "PG-029",
    path: "/equipment/roasting-machines/home",
    title: "مكائن التحميص المنزلية",
    eyebrow: "مكائن التحميص",
    desc: "سعات صغيرة وتحكم مبسط للاستخدام المنزلي والتجريبي.",
    kind: "listing",
  },
  {
    id: "PG-030",
    path: "/equipment/roasting-machines/commercial",
    title: "مكائن التحميص التجارية",
    eyebrow: "مكائن التحميص",
    desc: "قارن سعة الدفعة ومصدر الطاقة والتحكم والتركيب والصيانة.",
    kind: "listing",
  },
  {
    id: "PG-031",
    path: "/equipment/roasting-machines/kuban-supreme-3",
    title: "ماكينة تحميص Kuban Supreme 3",
    eyebrow: "تفاصيل ماكينة التحميص",
    desc: "سعة قصوى 3 كغم وإنتاج معلن يصل إلى 12 كغم/ساعة، بلا عرض محلي موثق في بغداد حتى الآن.",
    kind: "roaster-detail",
  },
  {
    id: "PG-061",
    path: "/equipment/grinders/1zpresso-j-ultra",
    title: "مطحنة 1Zpresso J-Ultra",
    eyebrow: "تفاصيل المنتج",
    desc: "مطحنة يدوية بشفرات مخروطية 48 مم وضبط 8 ميكرون لكل نقرة، محسّنة للإسبريسو.",
    kind: "product",
  },
  {
    id: "PG-032",
    path: "/equipment/care",
    title: "العناية والصيانة",
    eyebrow: "المعدات",
    desc: "معالجة المياه ومواد التنظيف وقطع الصيانة والتنظيم.",
    kind: "listing",
    tags: ["معالجة المياه", "مواد التنظيف", "قطع الصيانة", "منظمات ركن القهوة"],
  },
  {
    id: "PG-033",
    path: "/equipment/care/water",
    title: "معالجة المياه",
    eyebrow: "العناية والصيانة",
    desc: "فلاتر وحلول قياس وحماية للمعدات وتحسين الاستخلاص.",
    kind: "listing",
  },
  {
    id: "PG-034",
    path: "/equipment/care/cleaning",
    title: "مواد التنظيف",
    eyebrow: "العناية والصيانة",
    desc: "منظفات للمجموعات والمطاحن وأنظمة الحليب والأسطح.",
    kind: "listing",
  },
  {
    id: "PG-035",
    path: "/equipment/care/parts",
    title: "قطع الصيانة",
    eyebrow: "العناية والصيانة",
    desc: "قطع استبدال موثقة التوافق مع الموديلات.",
    kind: "listing",
  },
  {
    id: "PG-036",
    path: "/equipment/care/organizers",
    title: "منظمات ركن القهوة",
    eyebrow: "العناية والصيانة",
    desc: "حلول ترتيب الأدوات والملحقات ومساحة العمل.",
    kind: "listing",
  },
  {
    id: "PG-037",
    path: "/directory",
    title: "دليل جهات القهوة في بغداد",
    eyebrow: "الدليل",
    desc: "محامص ومقاهٍ ومورّدو معدات وبائعون ببيانات مراجعة وحقوق واضحة.",
    kind: "directory",
  },
  {
    id: "PG-038",
    path: "/directory/roasters",
    title: "المحامص في بغداد",
    eyebrow: "الدليل",
    desc: "جهات تحمص أو تبيع القهوة المحمصة مع الفروع وقنوات التواصل.",
    kind: "org-list",
  },
  {
    id: "PG-039",
    path: "/directory/cafes",
    title: "المقاهي في بغداد",
    eyebrow: "الدليل",
    desc: "مقاهٍ مختصة قابلة للاكتشاف حسب المنطقة والخدمات.",
    kind: "org-list",
  },
  {
    id: "PG-040",
    path: "/directory/equipment-suppliers",
    title: "مورّدو المعدات",
    eyebrow: "الدليل",
    desc: "معدات وتركيب وضمان وصيانة وقطع غيار بحسب الأدلة المتاحة.",
    kind: "org-list",
  },
  {
    id: "PG-041",
    path: "/directory/sellers",
    title: "البائعون والمتاجر",
    eyebrow: "الدليل",
    desc: "قنوات إحالة موثقة لمنتجات داخلة في نطاق V1.",
    kind: "org-list",
  },
  {
    id: "PG-042",
    path: "/directory/sumer",
    title: "محمصة سومر",
    eyebrow: "جهة موثقة T2",
    desc: "محمصة بغدادية مع فرعين وقهوة محمصة وقنوات تواصل عامة.",
    kind: "org",
  },
  {
    id: "PG-043",
    path: "/directory/sumer/branches",
    title: "فروع محمصة سومر",
    eyebrow: "الفروع",
    desc: "العناوين وساعات العمل والخريطة وقنوات الاتصال لكل فرع.",
    kind: "branches",
  },
  {
    id: "PG-044",
    path: "/origins",
    title: "مصادر القهوة",
    eyebrow: "من الحبة إلى الفنجان",
    desc: "استكشف الدول والمناطق والمزارع والمعالجات المرتبطة بالقهوة.",
    kind: "origins",
  },
  {
    id: "PG-045",
    path: "/origins/ethiopia",
    title: "إثيوبيا",
    eyebrow: "دولة منشأ",
    desc: "مناطق زراعة متعددة وتنوع وراثي ومعالجات مختلفة.",
    kind: "origin",
  },
  {
    id: "PG-046",
    path: "/origins/ethiopia/guji",
    title: "منطقة قوجي",
    eyebrow: "منطقة قهوة",
    desc: "صفحة تربط المنطقة بالقهوة المتوفرة والمحتوى والجهات ذات الصلة.",
    kind: "origin",
  },
  {
    id: "PG-047",
    path: "/knowledge",
    title: "مركز المعرفة",
    eyebrow: "تعلّم",
    desc: "أدلة مبسطة للتحضير والطحن والتحميص والمياه والصيانة.",
    kind: "knowledge",
  },
  {
    id: "PG-048",
    path: "/knowledge/brewing",
    title: "أساسيات التحضير",
    eyebrow: "المعرفة",
    desc: "جرعة ونسبة ووقت وحرارة وطحن بخطوات قابلة للتطبيق.",
    kind: "articles",
  },
  {
    id: "PG-049",
    path: "/knowledge/grinding",
    title: "دليل الطحن",
    eyebrow: "المعرفة",
    desc: "كيف تؤثر درجة الطحن والاتساق على الاستخلاص والطعم.",
    kind: "articles",
  },
  {
    id: "PG-050",
    path: "/knowledge/roasting",
    title: "أساسيات التحميص",
    eyebrow: "المعرفة",
    desc: "مراحل التحميص والطاقة والتهوية وتسجيل الملف دون ادعاءات غير موثقة.",
    kind: "articles",
  },
  {
    id: "PG-051",
    path: "/knowledge/water",
    title: "الماء والقهوة",
    eyebrow: "المعرفة",
    desc: "مفاهيم عملية لجودة الماء وحماية المعدات.",
    kind: "articles",
  },
  {
    id: "PG-052",
    path: "/knowledge/cleaning",
    title: "تنظيف المعدات",
    eyebrow: "المعرفة",
    desc: "جداول تنظيف آمنة مرتبطة بتعليمات الشركات المصنعة.",
    kind: "articles",
  },
  {
    id: "PG-053",
    path: "/knowledge/v60-guide",
    title: "طريقة تحضير V60",
    eyebrow: "دليل تطبيقي",
    desc: "وصفة بداية قابلة للتعديل حسب القهوة والمطحنة والذوق.",
    kind: "article",
  },
  {
    id: "PG-054",
    path: "/search",
    title: "البحث في المنصة",
    eyebrow: "بحث موحّد",
    desc: "ابحث في القهوة والمعدات والجهات والمصادر والمحتوى بالعربية والإنجليزية.",
    kind: "search",
  },
  {
    id: "PG-055",
    path: "/compare",
    title: "مقارنة المنتجات",
    eyebrow: "المقارنة",
    desc: "مقارنة من النوع نفسه فقط مع إبراز الاختلافات والبيانات الناقصة.",
    kind: "compare",
  },
  {
    id: "PG-056",
    path: "/favorites",
    title: "العناصر المحفوظة",
    eyebrow: "المفضلة",
    desc: "قهوة ومعدات وجهات ومحتوى محفوظ محلياً على جهازك.",
    kind: "favorites",
  },
  {
    id: "PG-057",
    path: "/rights/correction",
    title: "طلب تصحيح معلومة",
    eyebrow: "الحقوق",
    desc: "حدد السجل والحقل والتصحيح المقترح وأرفق دليلاً مناسباً.",
    kind: "form",
  },
  {
    id: "PG-058",
    path: "/rights/removal",
    title: "طلب إزالة أو اعتراض",
    eyebrow: "الحقوق",
    desc: "مسار واضح لمراجعة أساس الإدراج أو إزالة بيانات محددة.",
    kind: "form",
  },
  {
    id: "PG-059",
    path: "/rights/claim",
    title: "المطالبة بصفحة جهة",
    eyebrow: "الحقوق",
    desc: "تحقق من صفتك ثم اطلب إدارة البيانات العامة للجهة.",
    kind: "form",
  },
  {
    id: "PG-060",
    path: "/operations",
    title: "لوحة تشغيل V1 الخاصة",
    eyebrow: "خاص بالمالك",
    desc: "مؤشرات الاتصال والإطلاق وحالة البيانات قبل اعتماد النشر.",
    kind: "operations",
  },
  {
    id: "PG-060A",
    path: "/partner",
    title: "بوابة الجهات والبائعين",
    eyebrow: "حساب الجهة",
    desc: "أدخل تحديثات صفحتك ومنتجاتك وعروضك، ثم تابع نتيجة مراجعة فريق قهوتنا.",
    kind: "partner",
  },
  {
    id: "PG-061",
    path: "/beta",
    title: "ابدأ اختبار النسخة التجريبية",
    eyebrow: "الاختبار المغلق",
    desc: "مسار قصير ومنظم لاختبار أهم رحلات V1 وتسجيل النتيجة دون بيانات شخصية.",
    kind: "beta-hub",
  },
  {
    id: "PG-062",
    path: "/beta/feedback",
    title: "سجّل نتيجة الاختبار",
    eyebrow: "الاختبار المغلق",
    desc: "أرسل نتيجة مهمة واحدة ومكان التعطل لنحوّل الملاحظة إلى إصلاح قابل للقياس.",
    kind: "beta-feedback",
  },
  {
    id: "PG-063",
    path: "/help",
    title: "المساعدة والتواصل",
    eyebrow: "خدمة المستخدم",
    desc: "سجّل المشكلة أو الاقتراح واحصل على رقم مرجعي، ثم تابع معنا عبر واتساب عند الحاجة.",
    kind: "help-support",
  },
  {
    id: "PG-064",
    path: "/privacy",
    title: "سياسة الخصوصية",
    eyebrow: "الثقة والحقوق",
    desc: "ما الذي تحفظه المنصة، وما الذي يبقى على جهازك، وكيف تطلب الوصول أو الحذف.",
    kind: "policy",
  },
  {
    id: "PG-065",
    path: "/terms",
    title: "شروط الاستخدام",
    eyebrow: "الثقة والحقوق",
    desc: "حدود دور المنصة، مسؤولية العروض الخارجية، وقواعد الاستخدام المقبول.",
    kind: "policy",
  },
];

type CatalogItem = {
  id: string;
  recordSlug?: string;
  name: string;
  meta: string;
  price: string;
  type: "coffee" | "equipment";
  group: string;
  href: string;
  score?: string;
  img?: string;
  reviewLabel?: string;
  brand?: string;
  numericPrice?: number | null;
  availableInBaghdad?: boolean;
  drive?: "manual" | "electric";
  burrGeometry?: "flat" | "conical";
  roasterClass?: "home" | "sample" | "commercial_batch";
  heatSource?: "electric" | "natural_gas" | "lpg" | "dual_fuel";
  checkedAt?: string | null;
};
const coffees: CatalogItem[] = [
  {
    id: "demo-coffee-guji",
    name: "سومر — إثيوبيا قوجي",
    meta: "فلتر · طبيعية · توت وكاكاو",
    price: "24,000 د.ع",
    score: "94%",
    type: "coffee",
    group: "roasted-coffee",
    href: "/coffee/sumer-ethiopia",
    img: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "demo-coffee-colombia",
    name: "رافدين — كولومبيا",
    meta: "أومني · مغسولة · كراميل وحمضيات",
    price: "22,500 د.ع",
    score: "89%",
    type: "coffee",
    group: "roasted-coffee",
    href: "/compare",
    img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "demo-coffee-blend",
    name: "نخلة — مزيج إسبريسو",
    meta: "إسبريسو · شوكولاتة ومكسرات",
    price: "19,000 د.ع",
    score: "86%",
    type: "coffee",
    group: "roasted-coffee",
    href: "/compare",
    img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80",
  },
];
const equipment: CatalogItem[] = [
  {
    id: "review-df54-v4",
    recordSlug: "df54-v4-coffee-grinder",
    name: "مطحنة DF54 V4",
    meta: "كهربائية · شفرات مسطحة 54 مم · أحادية الجرعة",
    price: "325,250 د.ع · سعر مرصود",
    type: "equipment",
    group: "electric-grinder",
    href: "/equipment/grinders/df54-v4",
    reviewLabel: "موثق المصدر · قيد المراجعة",
    brand: "DF Grinders",
    numericPrice: 325250,
    availableInBaghdad: false,
    drive: "electric",
    burrGeometry: "flat",
    checkedAt: "2026-08-09T00:00:00Z",
  },
  {
    id: "review-kuban-supreme-3",
    recordSlug: "kuban-supreme-3",
    name: "ماكينة تحميص Kuban Supreme 3",
    meta: "تجارية · دفعة 3 كغم · غاز طبيعي أو LPG",
    price: "لا يوجد عرض محلي موثق",
    type: "equipment",
    group: "commercial-roaster",
    href: "/equipment/roasting-machines/kuban-supreme-3",
    reviewLabel: "موثق المصنّع · قيد المراجعة",
    brand: "Kuban",
    numericPrice: null,
    availableInBaghdad: false,
    roasterClass: "commercial_batch",
    heatSource: "dual_fuel",
    checkedAt: "2026-08-09T00:00:00Z",
  },
  {
    id: "review-1zpresso-j-ultra",
    recordSlug: "1zpresso-j-ultra",
    name: "مطحنة 1Zpresso J-Ultra",
    meta: "يدوية · شفرات مخروطية 48 مم · إسبريسو",
    price: "438,000 د.ع · سعر مرصود",
    type: "equipment",
    group: "manual-grinder",
    href: "/equipment/grinders/1zpresso-j-ultra",
    reviewLabel: "موثق المصدر · قيد المراجعة",
    brand: "1Zpresso",
    numericPrice: 438000,
    availableInBaghdad: false,
    drive: "manual",
    burrGeometry: "conical",
    checkedAt: "2026-08-09T00:00:00Z",
  },
];

type ReviewOrganization = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  roles: string[];
  districts: string[];
  sourceUrl: string;
  sourceCheckedAt: string;
  decision: "ready_for_review" | "held";
  note?: string;
};

const reviewOrganizations: ReviewOrganization[] = [
  {
    id: "ORG-BGD-001",
    slug: "ridha-alwan-coffee",
    nameAr: "بُن رضا علوان",
    nameEn: "Ridha Alwan Coffee",
    roles: ["roaster", "cafe", "seller"],
    districts: ["كرادة داخل", "زيونة", "الأعظمية", "كرادة شرقية", "حي الجامعة"],
    sourceUrl: "https://ridhaalwancoffee.com/ar/",
    sourceCheckedAt: "2026-08-09",
    decision: "ready_for_review",
  },
  {
    id: "ORG-BGD-002",
    slug: "locus-coffee-iraq",
    nameAr: "لوكاس",
    nameEn: "Locus Specialty Coffee",
    roles: ["cafe"],
    districts: ["المنصور", "شارع فلسطين", "الأعظمية"],
    sourceUrl: "https://locu.life/",
    sourceCheckedAt: "2026-08-09",
    decision: "ready_for_review",
  },
  {
    id: "ORG-BGD-003",
    slug: "garam-cafe",
    nameAr: "مقهى غرام",
    nameEn: "Garam Cafe",
    roles: ["cafe"],
    districts: ["اليرموك"],
    sourceUrl: "https://garamcafe.com/contact",
    sourceCheckedAt: "2026-08-09",
    decision: "ready_for_review",
  },
  {
    id: "ORG-BGD-004",
    slug: "mr-kims-cafe",
    nameAr: "مقهى مستر كيم",
    nameEn: "Mr. Kim's Cafe",
    roles: ["cafe"],
    districts: ["الصليخ"],
    sourceUrl: "https://mrkimscafe.com/",
    sourceCheckedAt: "2026-08-09",
    decision: "ready_for_review",
  },
  {
    id: "ORG-BGD-005",
    slug: "kshta-coffee-tools",
    nameAr: "كشتة لأدوات القهوة",
    nameEn: "Kshta Coffee Tools",
    roles: ["equipment_supplier", "seller", "service_provider"],
    districts: ["اليرموك"],
    sourceUrl: "https://kshtaiq.com/pages/contact",
    sourceCheckedAt: "2026-08-09",
    decision: "ready_for_review",
  },
  {
    id: "ORG-BGD-006",
    slug: "italian-coffee-store-iraq",
    nameAr: "المتجر الإيطالي للقهوة",
    nameEn: "Italian Coffee Store Company",
    roles: ["equipment_supplier", "seller"],
    districts: [],
    sourceUrl: "https://italiancoffee-co.com/en/contact-us",
    sourceCheckedAt: "2026-08-09",
    decision: "held",
    note: "معلّقة: المصدر الحالي يثبت مكتب أربيل ولا يثبت موقع بغداد السابق.",
  },
  {
    id: "ORG-BGD-007",
    slug: "nespresso-iraq",
    nameAr: "نسبرسو العراق",
    nameEn: "Nespresso Iraq",
    roles: ["equipment_supplier", "seller"],
    districts: ["الجادرية مول", "عراق مول"],
    sourceUrl: "https://www.nespresso.com/iq/en/",
    sourceCheckedAt: "2026-08-09",
    decision: "ready_for_review",
  },
  {
    id: "ORG-BGD-008",
    slug: "sumer-land",
    nameAr: "شركة أرض سومر",
    nameEn: "Sumer Land Co.",
    roles: ["equipment_supplier", "importer", "service_provider"],
    districts: ["السيدية"],
    sourceUrl: "https://www.slco.com.iq/",
    sourceCheckedAt: "2026-08-09",
    decision: "ready_for_review",
  },
];

const organizationRoleLabels: Record<string, string> = {
  roaster: "محمصة",
  cafe: "مقهى",
  seller: "بائع",
  equipment_supplier: "مورد معدات",
  service_provider: "خدمات وصيانة",
  importer: "مستورد",
  manufacturer: "مصنّع",
};

const organizationVerificationLabels: Record<string, string> = {
  t1_self_declared: "بيانات مقدمة من الجهة",
  t2_source_checked: "موثّق المصدر",
  t3_entity_verified: "جهة متحقّق منها",
};

function organizationRoleLabel(role: string) {
  return organizationRoleLabels[role] || "خدمة أخرى";
}

function organizationVerificationLabel(tier: string) {
  return organizationVerificationLabels[tier] || "حالة التحقق موثقة";
}
const families = [
  "مطاحن القهوة",
  "أدوات التحضير",
  "مكائن التحضير",
  "مكائن التحميص",
  "العناية والصيانة",
];

const categoryByPath: Record<string, string> = {
  "/coffee": "COF-ROASTED",
  "/equipment/grinders": "EQP-GRD",
  "/equipment/grinders/manual": "EQP-GRD-MAN",
  "/equipment/grinders/electric": "EQP-GRD-ELE",
  "/equipment/brew-tools": "EQP-BRW",
  "/equipment/brew-tools/drippers": "EQP-BRW-DRP",
  "/equipment/brew-tools/kettles": "EQP-KET",
  "/equipment/brew-tools/scales": "EQP-MSR-SCL",
  "/equipment/brew-tools/filters": "EQP-FIL",
  "/equipment/brew-tools/servers": "EQP-SRV",
  "/equipment/brew-tools/timers": "EQP-MSR",
  "/equipment/brew-machines/espresso": "EQP-MCH-ESP",
  "/equipment/brew-machines": "EQP-MCH",
  "/equipment/brew-machines/filter": "EQP-MCH-FLT",
  "/equipment/brew-machines/capsule": "EQP-MCH-CAP",
  "/equipment/roasting-machines": "EQP-ROA",
  "/equipment/roasting-machines/sample": "EQP-ROA-SMP",
  "/equipment/roasting-machines/home": "EQP-ROA-HOM",
  "/equipment/roasting-machines/commercial": "EQP-ROA-COM",
  "/equipment/care/water": "EQP-WCS-WAT",
  "/equipment/care/cleaning": "EQP-WCS-CLN",
  "/equipment/care": "EQP-WCS",
  "/equipment/care/parts": "EQP-WCS-PRT",
  "/equipment/care/organizers": "EQP-WCS-ORG",
};

function formatPrice(price: number | null, currency: string) {
  if (price === null) return "السعر غير متوفر";
  const formatted = new Intl.NumberFormat("ar-IQ", {
    maximumFractionDigits: 0,
  }).format(price);
  return currency === "IQD" ? `${formatted} د.ع` : `${formatted} ${currency}`;
}

function toCatalogItem(product: PublicProduct): CatalogItem {
  const primary =
    product.product_categories.find((relation) => relation.is_primary)
      ?.categories || product.product_categories[0]?.categories;
  const offer = [...product.offers]
    .filter((item) => item.price !== null)
    .sort((a, b) => Number(a.price) - Number(b.price))[0];
  const attribute = (code: string) =>
    product.product_attribute_values.find(
      (value) => value.field_definitions?.code === code,
    )?.value_text;
  return {
    id: product.id,
    recordSlug: product.slug,
    name: product.name_ar,
    meta: [product.brands?.name_ar, product.model_number, primary?.name_ar]
      .filter(Boolean)
      .join(" · "),
    price: offer
      ? formatPrice(offer.price, offer.currency_code)
      : "لا يوجد عرض منشور",
    type: product.product_kind === "roasted_coffee" ? "coffee" : "equipment",
    group: primary?.comparison_group || primary?.code || product.product_kind,
    href:
      product.product_kind === "roasted_coffee"
        ? `/coffee/${product.slug}`
        : `/equipment/${product.slug}`,
    reviewLabel: `منشور · ${product.verification_tier.replace("t2_source_checked", "T2")}`,
    brand: product.brands?.name_en || product.brands?.name_ar,
    numericPrice: offer?.price ?? null,
    availableInBaghdad: product.offers.some(
      (entry) => entry.availability === "in_stock",
    ),
    drive: attribute("grinder_drive") as CatalogItem["drive"],
    burrGeometry: attribute("burr_geometry") as CatalogItem["burrGeometry"],
    roasterClass: attribute("roaster_use_class") as CatalogItem["roasterClass"],
    heatSource:
      (product.roaster_specifications?.heat_source as CatalogItem["heatSource"]) ||
      undefined,
    checkedAt: product.source_checked_at,
  };
}

function attributeDisplayValue(
  value: PublicProduct["product_attribute_values"][number],
) {
  const raw =
    value.value_text ??
    value.value_integer ??
    value.value_decimal ??
    value.value_boolean ??
    value.value_date ??
    value.value_json;
  if (Array.isArray(raw)) return raw.join("، ");
  if (typeof raw === "boolean") return raw ? "نعم" : "لا";
  if (raw && typeof raw === "object") return JSON.stringify(raw);
  if (raw === null || raw === undefined || raw === "") return "غير متوفر";
  const unit = value.unit_code || value.field_definitions?.unit_code;
  return `${String(raw)}${unit ? ` ${unit}` : ""}`;
}

function Icon({ name }: { name: string }) {
  const map: Record<string, string> = {
    coffee: "☕",
    gear: "⚙",
    place: "⌖",
    learn: "◫",
    origin: "◉",
    search: "⌕",
    heart: "♡",
    compare: "⇄",
    check: "✓",
  };
  return (
    <span className="icon" aria-hidden>
      {map[name] || "•"}
    </span>
  );
}
function useStoredItems(key: string) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const syncItems = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; items: CatalogItem[] }>)
        .detail;
      if (detail?.key === key) setItems(detail.items);
    };
    window.addEventListener("coffee-platform-storage", syncItems);
    const handle = window.setTimeout(() => {
      try {
        const value = localStorage.getItem(key);
        setItems(value ? JSON.parse(value) : []);
      } catch {
        setItems([]);
      }
      setReady(true);
    }, 0);
    return () => {
      window.clearTimeout(handle);
      window.removeEventListener("coffee-platform-storage", syncItems);
    };
  }, [key]);
  const updateItems = (next: CatalogItem[]) => {
    setItems(next);
    localStorage.setItem(key, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent("coffee-platform-storage", {
        detail: { key, items: next },
      }),
    );
  };
  return { items, setItems: updateItems, ready };
}
function useReturnTo(fallback: string) {
  const [returnTo, setReturnTo] = useState(fallback);
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const candidate = new URLSearchParams(window.location.search).get("from");
      if (candidate?.startsWith("/") && !candidate.startsWith("//")) {
        setReturnTo(candidate);
      }
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);
  return returnTo;
}

function withReturnTo(href: string, returnTo?: string) {
  if (!returnTo) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}from=${encodeURIComponent(returnTo)}`;
}

function offerAvailabilityLabel(value: string) {
  const labels: Record<string, string> = {
    in_stock: "متوفر لدى البائع",
    out_of_stock: "غير متوفر حالياً",
    preorder: "طلب مسبق",
    backorder: "متاح بالطلب",
    unknown: "التوفر غير مؤكد",
  };
  return labels[value] || "التوفر غير مؤكد";
}

function toggleItem(items: CatalogItem[], item: CatalogItem) {
  return items.some((x) => x.id === item.id)
    ? items.filter((x) => x.id !== item.id)
    : [...items, item];
}
type PlatformStatus = {
  connected: boolean;
  launchMarket: string;
  publicLaunch: boolean;
  roastingMachines?: boolean;
  greenCoffee?: boolean;
};
type PublicOrganization = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  website_url: string | null;
  phone: string | null;
  verification_tier: string;
  source_checked_at: string | null;
  media: Array<{ id: string; url: string; alt_ar: string; is_primary: boolean; sort_order: number }>;
  organization_roles: Array<{ role_type: string; is_primary: boolean }>;
  locations: Array<{
    id: string;
    name_ar: string | null;
    address_ar: string;
    district_ar: string | null;
  }>;
};

function directoryLocationArea(
  location: PublicOrganization["locations"][number],
) {
  return location.district_ar || location.name_ar || null;
}

function arabicBranchCount(count: number) {
  if (count === 1) return "فرع واحد في بغداد";
  if (count === 2) return "فرعان في بغداد";
  if (count >= 3 && count <= 10) return `${count} فروع في بغداد`;
  return `${count} فرعاً في بغداد`;
}

function organizationBranchSummary(
  locations: PublicOrganization["locations"],
) {
  const names = Array.from(
    new Set(
      locations
        .map(
          (location) =>
            location.name_ar || location.district_ar || location.address_ar,
        )
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, "ar"));

  return {
    count: locations.length,
    countLabel: locations.length
      ? arabicBranchCount(locations.length)
      : "الموقع قيد الاستكمال",
    names,
  };
}
type PublicProduct = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  summary_ar: string | null;
  description_ar: string | null;
  product_kind: string;
  model_number: string | null;
  verification_tier: string;
  source_checked_at: string | null;
  media: Array<{ id: string; url: string; alt_ar: string; is_primary: boolean; sort_order: number }>;
  brands: { slug: string; name_ar: string; name_en: string | null } | null;
  product_categories: Array<{
    is_primary: boolean;
    categories: {
      id: string;
      code: string;
      slug: string;
      name_ar: string;
      name_en: string;
      comparison_group: string | null;
    } | null;
  }>;
  offers: Array<{
    id: string;
    price: number | null;
    currency_code: string;
    availability: string;
    external_url: string;
    observed_at: string;
    media: Array<{ id: string; url: string; alt_ar: string; is_primary: boolean; sort_order: number }>;
    organizations: {
      slug: string;
      name_ar: string;
      name_en: string | null;
    } | null;
  }>;
  product_attribute_values: Array<{
    value_text: string | null;
    value_integer: number | null;
    value_decimal: number | null;
    value_boolean: boolean | null;
    value_date: string | null;
    value_json: unknown;
    unit_code: string | null;
    field_definitions: {
      code: string;
      name_ar: string;
      name_en: string;
      unit_code: string | null;
    } | null;
  }>;
  roaster_specifications: {
    application: string[];
    heat_source: string | null;
    batch_min_kg: number | null;
    batch_max_kg: number | null;
    production_kg_per_hour: number | null;
    control_level: string | null;
    power_supply: string | null;
    gas_type: string | null;
    exhaust_requirements: string | null;
    dimensions_mm: Record<string, unknown>;
    weight_kg: number | null;
    warranty_months: number | null;
    source_checked_at: string;
  } | null;
};
type PublicOriginCountry = {
  code: string;
  name_ar: string;
  name_en: string;
  coffee_regions: Array<{
    id: string;
    slug: string;
    name_ar: string;
    name_en: string | null;
    altitude_min_m: number | null;
    altitude_max_m: number | null;
    origin_claims: Array<{
      process_code: string | null;
      variety_codes: string[];
      harvest_label: string | null;
      products: {
        slug: string;
        name_ar: string;
        summary_ar: string | null;
        product_kind: string;
      } | null;
    }>;
  }>;
};
type PublicContent = {
  id: string;
  slug: string;
  type: string;
  title_ar: string;
  title_en: string | null;
  excerpt_ar: string | null;
  body_ar: string | null;
  published_at: string | null;
  content_topics: Array<{
    topics: { slug: string; name_ar: string; name_en: string } | null;
  }>;
  content_links: Array<{
    relation_type: string;
    products: { slug: string; name_ar: string; product_kind: string } | null;
    organizations: { slug: string; name_ar: string } | null;
    countries: { code: string; name_ar: string } | null;
    coffee_regions: { slug: string; name_ar: string; country_code: string } | null;
  }>;
};

function usePublicOrigins() {
  const [state, setState] = useState<{
    loading: boolean;
    connected: boolean;
    countries: PublicOriginCountry[];
  }>({ loading: true, connected: false, countries: [] });
  useEffect(() => {
    let active = true;
    fetch("/api/public-origins")
      .then(async (response) => await response.json())
      .then((data) => {
        if (active)
          setState({
            loading: false,
            connected: Boolean(data.connected),
            countries: Array.isArray(data.countries) ? data.countries : [],
          });
      })
      .catch(() => {
        if (active) setState({ loading: false, connected: false, countries: [] });
      });
    return () => {
      active = false;
    };
  }, []);
  return state;
}

function usePublicContent() {
  const [state, setState] = useState<{
    loading: boolean;
    connected: boolean;
    contents: PublicContent[];
  }>({ loading: true, connected: false, contents: [] });
  useEffect(() => {
    let active = true;
    fetch("/api/public-content")
      .then(async (response) => await response.json())
      .then((data) => {
        if (active)
          setState({
            loading: false,
            connected: Boolean(data.connected),
            contents: Array.isArray(data.contents) ? data.contents : [],
          });
      })
      .catch(() => {
        if (active) setState({ loading: false, connected: false, contents: [] });
      });
    return () => {
      active = false;
    };
  }, []);
  return state;
}
function usePlatformStatus() {
  const [status, setStatus] = useState<PlatformStatus | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/platform-status")
      .then(async (response) => await response.json())
      .then((data) => {
        if (active) setStatus(data);
      })
      .catch(() => {
        if (active)
          setStatus({
            connected: false,
            launchMarket: "IQ-BGD",
            publicLaunch: false,
          });
      });
    return () => {
      active = false;
    };
  }, []);
  return status;
}
function usePublicDirectory() {
  const [state, setState] = useState<{
    loading: boolean;
    connected: boolean;
    organizations: PublicOrganization[];
  }>({ loading: true, connected: false, organizations: [] });
  useEffect(() => {
    let active = true;
    fetch("/api/public-directory")
      .then(async (response) => await response.json())
      .then((data) => {
        if (active)
          setState({
            loading: false,
            connected: Boolean(data.connected),
            organizations: Array.isArray(data.organizations)
              ? data.organizations
              : [],
          });
      })
      .catch(() => {
        if (active)
          setState({ loading: false, connected: false, organizations: [] });
      });
    return () => {
      active = false;
    };
  }, []);
  return state;
}
type PublicCategoryOption = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  catalog_product_kind: string | null;
};

function usePublicProducts(category?: string, slug?: string, kind?: string, navigationRoot?: string) {
  const [state, setState] = useState<{
    loading: boolean;
    connected: boolean;
    products: PublicProduct[];
    categoryOptions: PublicCategoryOption[];
  }>({ loading: true, connected: false, products: [], categoryOptions: [] });
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (slug) params.set("slug", slug);
    if (kind) params.set("kind", kind);
    if (navigationRoot) params.set("navigationRoot", navigationRoot);
    fetch(`/api/public-products?${params.toString()}`, { cache: "no-store" })
      .then(async (response) => await response.json())
      .then((data) => {
        if (active)
          setState({
            loading: false,
            connected: Boolean(data.connected),
            products: Array.isArray(data.products) ? data.products : [],
            categoryOptions: Array.isArray(data.categoryOptions) ? data.categoryOptions : [],
          });
      })
      .catch(() => {
        if (active)
          setState({ loading: false, connected: false, products: [], categoryOptions: [] });
      });
    return () => {
      active = false;
    };
  }, [category, slug, kind, navigationRoot]);
  return state;
}
function Header() {
  const [open, setOpen] = useState(false);
  const status = usePlatformStatus();
  const comparison = useStoredItems("coffee-platform-v1-comparison");
  const connected = status?.connected === true;
  const launchOn = status?.publicLaunch === true;
  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign("/");
  };
  const closeMenu = () => setOpen(false);
  return (
    <>
      <Link className="skip-link" href="#main-content">
        الانتقال إلى المحتوى
      </Link>
      <div className="notice" role="status">
        <span className={connected ? "db-dot connected" : "db-dot"} />
        {connected ? "قاعدة البيانات متصلة" : "نسخة V1 خاصة"} — بغداد أولاً ·{" "}
        {launchOn ? "الإطلاق العام مفعّل" : "الإطلاق العام متوقف"}
      </div>
      <header>
        <Link className="brand" href="/">
          <b>قَهوتنا</b>
          <small>مرجعك لاختيارٍ أوضح</small>
        </Link>
        <button
          className="menu"
          onClick={() => setOpen(!open)}
          aria-label="فتح القائمة"
          aria-expanded={open}
          aria-controls="site-menu-panel"
        >
          ☰
        </button>
        <nav id="primary-navigation">
          <Link href="/coffee">القهوة</Link>
          <Link href="/equipment">المعدات</Link>
          <Link href="/directory">الدليل</Link>
          <Link href="/origins">المصادر</Link>
          <Link href="/knowledge">تعلّم</Link>
        </nav>
        <div className="actions">
          <button type="button" className="header-back" onClick={goBack} aria-label="الرجوع إلى الصفحة السابقة">← <span>رجوع</span></button>
          <Link href="/search" aria-label="البحث">
            <Icon name="search" />
          </Link>
          <Link className="compare-nav-link" href="/compare" aria-label={`المقارنة، ${comparison.items.length} منتجات`}>
            <Icon name="compare" />
            <span>المقارنة</span>
            {comparison.items.length > 0 && <b>{comparison.items.length}</b>}
          </Link>
          <Link href="/favorites" aria-label="المفضلة">
            <Icon name="heart" />
          </Link>
        </div>
      </header>
      {open && <div className="site-menu-backdrop" role="presentation" onClick={closeMenu}>
        <aside id="site-menu-panel" className="site-menu-panel" role="dialog" aria-modal="true" aria-label="قائمة المنصة" onClick={(event) => event.stopPropagation()}>
          <div className="site-menu-title"><div><b>قَهوتنا</b><span>اختصارات المنصة</span></div><button type="button" onClick={closeMenu} aria-label="إغلاق القائمة">×</button></div>
          <nav aria-label="روابط القائمة المختصرة">
            <Link href="/coffee" onClick={closeMenu}>القهوة</Link><Link href="/equipment" onClick={closeMenu}>المعدات</Link><Link href="/directory" onClick={closeMenu}>دليل الجهات والبائعين</Link><Link href="/origins" onClick={closeMenu}>مصادر القهوة</Link><Link href="/knowledge" onClick={closeMenu}>التعلم والمعرفة</Link>
          </nav>
          <div className="site-menu-tools"><b>أدواتي</b><Link href="/search" onClick={closeMenu}>البحث</Link><Link href="/compare" onClick={closeMenu}>المقارنة ({comparison.items.length})</Link><Link href="/favorites" onClick={closeMenu}>المفضلة</Link></div>
          <div className="site-menu-tools"><b>المساعدة والإدارة</b><Link href="/help" onClick={closeMenu}>المساعدة والتواصل</Link><Link href="/operations" onClick={closeMenu}>لوحة تشغيل V1 الخاصة</Link></div>
        </aside>
      </div>}
      {comparison.ready && comparison.items.length > 0 && <div className="comparison-dock" role="status"><div><Icon name="compare" /><span><b>{comparison.items.length} من 4</b> منتجات من المجموعة نفسها</span></div><Link href="/compare">فتح المقارنة</Link><button type="button" onClick={() => comparison.setItems([])}>مسح</button></div>}
    </>
  );
}
function Footer() {
  return (
    <>
      <footer>
        <div>
          <b>قَهوتنا</b>
          <p>
            منصة مستقلة للاكتشاف والمقارنة. المنتجات والعروض تقود إلى صفحات
            البائعين داخل قَهوتنا.
          </p>
        </div>
        <div>
          <b>استكشف</b>
          <Link href="/coffee">القهوة</Link>
          <Link href="/equipment">المعدات</Link>
          <Link href="/directory">دليل بغداد</Link>
        </div>
        <div>
          <b>المساعدة والحقوق</b>
          <Link href="/help">المساعدة والتواصل</Link>
          <Link href="/rights/correction">تصحيح</Link>
          <Link href="/rights/removal">إزالة أو اعتراض</Link>
          <Link href="/rights/claim">مطالبة بصفحة</Link>
          <Link href="/privacy">الخصوصية</Link>
          <Link href="/terms">شروط الاستخدام</Link>
          <Link href="/operations">لوحة V1 الخاصة</Link>
          <Link href="/partner">بوابة الجهات والبائعين</Link>
          <Link href="/beta">بدء الاختبار المغلق</Link>
          <Link href="/beta/feedback">تسجيل نتيجة اختبار</Link>
        </div>
      </footer>
      <Link
        className="support-fab"
        href="/help"
        onClick={() => {
          if (typeof window !== "undefined" && window.location.pathname !== "/help")
            window.sessionStorage.setItem("coffee-support-from", window.location.pathname);
        }}
        aria-label="المساعدة والتواصل"
      >
        <span aria-hidden="true">؟</span>
        مساعدة
      </Link>
    </>
  );
}
function Breadcrumb({ page }: { page: PageDef }) {
  return (
    <div className="crumb">
      <Link href="/">الرئيسية</Link>
      <span>‹</span>
      <span>{page.eyebrow}</span>
      <span>‹</span>
      <b>{page.title}</b>
    </div>
  );
}
function Cards({
  type = "coffee",
  items: provided,
  returnTo,
  onNavigate,
}: {
  type?: string;
  items?: CatalogItem[];
  returnTo?: string;
  onNavigate?: () => void;
}) {
  const list = provided || (type === "coffee" ? coffees : equipment);
  const favorites = useStoredItems("coffee-platform-v1-favorites");
  const comparison = useStoredItems("coffee-platform-v1-comparison");
  return (
    <div className="cards">
      {list.map((x) => {
        const saved = favorites.items.some((y) => y.id === x.id);
        const compared = comparison.items.some((y) => y.id === x.id);
        const blocked =
          !compared &&
          (comparison.items.length >= 4 ||
            (comparison.items.length > 0 &&
              comparison.items[0].group !== x.group));
        return (
          <article className="card" key={x.id}>
            {x.type === "coffee" ? (
              <img
                src={x.img}
                alt={`صورة توضيحية لـ${x.name}`}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="product-art">
                <Icon name="gear" />
              </div>
            )}
            <div className="card-body">
              <div className="badges">
                <span>{x.reviewLabel || "نموذج بيانات V1"}</span>
                {x.score && <span>توافق {x.score}</span>}
              </div>
              <h3>{x.name}</h3>
              <p>{x.meta}</p>
              <div className="price">
                <b>{x.price}</b>
                <div className="card-tools">
                  <button
                    className={saved ? "active" : ""}
                    aria-label={saved ? "إزالة من المفضلة" : "حفظ في المفضلة"}
                    aria-pressed={saved}
                    onClick={() =>
                      favorites.setItems(toggleItem(favorites.items, x))
                    }
                  >
                    {saved ? "♥" : "♡"}
                  </button>
                  <button
                    className={compared ? "active" : ""}
                    aria-label={
                      comparison.items.length >= 4 && !compared
                        ? "الحد الأقصى أربعة منتجات للمقارنة"
                        : blocked
                        ? "اختر منتجاً من النوع نفسه للمقارنة"
                        : "إضافة إلى المقارنة"
                    }
                    aria-pressed={compared}
                    disabled={blocked}
                    onClick={() =>
                      comparison.setItems(toggleItem(comparison.items, x))
                    }
                  >
                    ⇄
                  </button>
                </div>
              </div>
              <Link
                className="stretched"
                href={withReturnTo(x.href, returnTo)}
                onClick={onNavigate}
              >
                عرض التفاصيل
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
type ListingFilterState = {
  categoryCode: string;
  query: string;
  brand: string;
  availabilityOnly: boolean;
  drive: "" | "manual" | "electric";
  burrGeometry: "" | "flat" | "conical";
  roasterClass: "" | "home" | "sample" | "commercial_batch";
  heatSource: "" | "electric" | "natural_gas" | "lpg" | "dual_fuel";
};

type ListingMode = "general" | "grinder" | "roaster";
type ListingSort = "relevance" | "price_asc" | "newest";

const initialListingFilters: ListingFilterState = {
  categoryCode: "",
  query: "",
  brand: "",
  availabilityOnly: false,
  drive: "",
  burrGeometry: "",
  roasterClass: "",
  heatSource: "",
};

function Filters({
  filters,
  onChange,
  onReset,
  brands,
  mode,
  categoryOptions,
}: {
  filters: ListingFilterState;
  onChange: (next: ListingFilterState) => void;
  onReset: () => void;
  brands: string[];
  mode: ListingMode;
  categoryOptions: PublicCategoryOption[];
}) {
  const update = <K extends keyof ListingFilterState>(
    key: K,
    value: ListingFilterState[K],
  ) => onChange({ ...filters, [key]: value });
  return (
    <aside className="filters">
      <b>تصفية النتائج</b>
      {categoryOptions.length > 0 && (
        <label>
          التصنيف الفرعي
          <select
            value={filters.categoryCode}
            onChange={(event) => update("categoryCode", event.target.value)}
          >
            <option value="">كل فئات القسم</option>
            {categoryOptions.map((option) => (
              <option value={option.code} key={option.id}>{option.name_ar}</option>
            ))}
          </select>
        </label>
      )}
      <label>
        بحث داخل النتائج
        <input
          type="search"
          value={filters.query}
          placeholder="اسم المنتج أو العلامة"
          onChange={(event) => update("query", event.target.value)}
        />
      </label>
      <label>
        العلامة
        <select
          value={filters.brand}
          onChange={(event) => update("brand", event.target.value)}
        >
          <option value="">جميع العلامات</option>
          {brands.map((brand) => (
            <option value={brand} key={brand}>
              {brand}
            </option>
          ))}
        </select>
      </label>
      {mode === "grinder" && (
        <>
          <label>
            نمط التشغيل
            <select
              value={filters.drive}
              onChange={(event) =>
                update("drive", event.target.value as ListingFilterState["drive"])
              }
            >
              <option value="">الكل</option>
              <option value="manual">يدوية</option>
              <option value="electric">كهربائية</option>
            </select>
          </label>
          <label>
            شكل الشفرات
            <select
              value={filters.burrGeometry}
              onChange={(event) =>
                update(
                  "burrGeometry",
                  event.target.value as ListingFilterState["burrGeometry"],
                )
              }
            >
              <option value="">الكل</option>
              <option value="flat">مسطحة</option>
              <option value="conical">مخروطية</option>
            </select>
          </label>
        </>
      )}
      {mode === "roaster" && (
        <>
          <label>
            فئة الاستخدام
            <select
              value={filters.roasterClass}
              onChange={(event) =>
                update(
                  "roasterClass",
                  event.target.value as ListingFilterState["roasterClass"],
                )
              }
            >
              <option value="">الكل</option>
              <option value="home">منزلية</option>
              <option value="sample">عينات</option>
              <option value="commercial_batch">تجارية</option>
            </select>
          </label>
          <label>
            مصدر الحرارة
            <select
              value={filters.heatSource}
              onChange={(event) =>
                update(
                  "heatSource",
                  event.target.value as ListingFilterState["heatSource"],
                )
              }
            >
              <option value="">الكل</option>
              <option value="electric">كهرباء</option>
              <option value="natural_gas">غاز طبيعي</option>
              <option value="lpg">غاز مسال LPG</option>
              <option value="dual_fuel">غاز طبيعي أو LPG</option>
            </select>
          </label>
        </>
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={filters.availabilityOnly}
          onChange={(event) => update("availabilityOnly", event.target.checked)}
        />{" "}
        متوفر في بغداد
      </label>
      <p className="filter-live">الفلاتر تطبق مباشرة</p>
      <button className="reset-filters" type="button" onClick={onReset}>
        مسح الفلاتر
      </button>
    </aside>
  );
}

function filterCatalogItems(
  items: CatalogItem[],
  filters: ListingFilterState,
  sort: ListingSort,
) {
  const query = filters.query.trim().toLocaleLowerCase("ar");
  const filtered = items.filter((item) => {
    const searchable = [item.name, item.meta, item.brand]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("ar");
    return (
      (!query || searchable.includes(query)) &&
      (!filters.brand || item.brand === filters.brand) &&
      (!filters.availabilityOnly || item.availableInBaghdad === true) &&
      (!filters.drive || item.drive === filters.drive) &&
      (!filters.burrGeometry || item.burrGeometry === filters.burrGeometry) &&
      (!filters.roasterClass || item.roasterClass === filters.roasterClass) &&
      (!filters.heatSource || item.heatSource === filters.heatSource)
    );
  });
  if (sort === "price_asc") {
    return filtered.sort((a, b) => {
      if (a.numericPrice == null) return 1;
      if (b.numericPrice == null) return -1;
      return a.numericPrice - b.numericPrice;
    });
  }
  if (sort === "newest") {
    return filtered.sort(
      (a, b) =>
        Date.parse(b.checkedAt || "1970-01-01") -
        Date.parse(a.checkedAt || "1970-01-01"),
    );
  }
  return filtered;
}

function Listing({ page }: { page: PageDef }) {
  const isCoffee = page.path.startsWith("/coffee");
  const status = usePlatformStatus();
  const mode: ListingMode = page.path.includes("/grinders")
    ? "grinder"
    : page.path.includes("/roasting-machines")
      ? "roaster"
      : "general";
  const [filters, setFilters] = useState<ListingFilterState>(
    initialListingFilters,
  );
  const [sort, setSort] = useState<ListingSort>("relevance");
  const [listingReady, setListingReady] = useState(false);
  const storageKey = `coffee-platform-v1-listing:${page.path}`;
  useEffect(() => {
    const handle = window.setTimeout(() => {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as {
            filters?: Partial<ListingFilterState>;
            sort?: ListingSort;
          };
          if (parsed.filters) {
            setFilters({ ...initialListingFilters, ...parsed.filters });
          }
          if (
            parsed.sort &&
            ["relevance", "price_asc", "newest"].includes(parsed.sort)
          ) {
            setSort(parsed.sort);
          }
        }
        const scrollY = Number(sessionStorage.getItem(`${storageKey}:scroll`));
        if (Number.isFinite(scrollY) && scrollY > 0) {
          window.requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
        }
      } catch {
        // Corrupt device-local state must never block the catalog.
      }
      setListingReady(true);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [storageKey]);
  useEffect(() => {
    if (listingReady) {
      sessionStorage.setItem(storageKey, JSON.stringify({ filters, sort }));
    }
  }, [filters, listingReady, sort, storageKey]);
  const rememberListingPosition = () => {
    sessionStorage.setItem(`${storageKey}:scroll`, String(window.scrollY));
  };
  const category = categoryByPath[page.path];
  const published = usePublicProducts(
    filters.categoryCode || category,
    undefined,
    isCoffee ? "roasted_coffee" : undefined,
    category,
  );
  const publishedItemsBase = published.products.map(toCatalogItem);
  const previewBase = useMemo(() => {
    if (isCoffee) return coffees;
    if (mode === "grinder") {
      const requestedDrive = page.path.endsWith("/manual")
        ? "manual"
        : page.path.endsWith("/electric")
          ? "electric"
          : undefined;
      return equipment.filter(
        (item) => item.drive && (!requestedDrive || item.drive === requestedDrive),
      );
    }
    if (mode === "roaster") {
      const requestedClass = page.path.endsWith("/sample")
        ? "sample"
        : page.path.endsWith("/home")
          ? "home"
          : page.path.endsWith("/commercial")
            ? "commercial_batch"
            : undefined;
      return equipment.filter(
        (item) =>
          item.roasterClass &&
          (!requestedClass || item.roasterClass === requestedClass),
      );
    }
    return [];
  }, [isCoffee, mode, page.path]);
  const visiblePreviewBase = useMemo(() => {
    const publishedSlugs = new Set(
      published.products.map((product) => product.slug),
    );
    return previewBase.filter(
      (item) => !item.recordSlug || !publishedSlugs.has(item.recordSlug),
    );
  }, [previewBase, published.products]);
  const publishedItems = useMemo(
    () =>
      publishedItemsBase.map((publishedItem) => {
        const reviewItem = previewBase.find(
          (item) => item.recordSlug === publishedItem.recordSlug,
        );
        if (!reviewItem) return publishedItem;
        return {
          ...publishedItem,
          brand: publishedItem.brand || reviewItem.brand,
          drive: publishedItem.drive || reviewItem.drive,
          burrGeometry:
            publishedItem.burrGeometry || reviewItem.burrGeometry,
          roasterClass:
            publishedItem.roasterClass || reviewItem.roasterClass,
          heatSource: publishedItem.heatSource || reviewItem.heatSource,
        };
      }),
    [previewBase, publishedItemsBase],
  );
  const brands = useMemo(
    () =>
      Array.from(
        new Set(
          [...publishedItems, ...visiblePreviewBase]
            .map((item) => item.brand)
            .filter((brand): brand is string => Boolean(brand)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [publishedItems, visiblePreviewBase],
  );
  const filteredPublished = filterCatalogItems(
    [...publishedItems],
    filters,
    sort,
  );
  const filteredPreview = filterCatalogItems(
    [...visiblePreviewBase],
    filters,
    sort,
  );
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  return (
    <>
      <div className="toolbar">
        <span>
          {published.loading
            ? "جارٍ عدّ المنتجات المنشورة…"
            : `${filteredPublished.length} منتج منشور · ${filteredPreview.length} قيد المراجعة`}
        </span>
        <select
          aria-label="ترتيب"
          value={sort}
          onChange={(event) => setSort(event.target.value as ListingSort)}
        >
          <option value="relevance">الأكثر صلة</option>
          <option value="price_asc">السعر: الأقل</option>
          <option value="newest">الأحدث تحققاً</option>
        </select>
      </div>
      <div className="catalog">
        <Filters
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters(initialListingFilters)}
          brands={brands}
          mode={mode}
          categoryOptions={published.categoryOptions}
        />
        <section>
          <div className="chips">
            {(page.tags || ["الأكثر صلة", "موثق", "بغداد"]).map((x) => (
              <span key={x}>{x}</span>
            ))}
            {activeFilterCount > 0 && (
              <b>{activeFilterCount} فلتر نشط</b>
            )}
          </div>
          <p className="filter-summary" aria-live="polite">
            تعرض النتائج المطابقة فوراً، ولا تُعدّ حالة التوفر المجهولة متوفرة.
            نحفظ الفلاتر والترتيب عند فتح المنتج والعودة.
          </p>
          {published.loading ? (
            <div className="directory-state" role="status">
              <span className="skeleton" />
              <span className="skeleton" />
              <p>جارٍ تحميل المنتجات المنشورة…</p>
            </div>
          ) : filteredPublished.length ? (
            <Cards
              items={filteredPublished}
              returnTo={page.path}
              onNavigate={rememberListingPosition}
            />
          ) : (
            <div className="directory-state">
              <Icon name="gear" />
              <h3>لا توجد منتجات منشورة في هذه الفئة بعد</h3>
              <p>
                {published.connected
                  ? "المنتجات الموجودة ما زالت قيد المراجعة ولن تظهر في الدليل العام قبل اعتمادها."
                  : "تعذر الاتصال ببيانات المنتجات، ولم نعرض سجلات بديلة على أنها منشورة."}
              </p>
            </div>
          )}
          {!published.loading && status?.publicLaunch !== true && (
            <div className="review-preview">
              <div className="section-head">
                <div>
                  <span className="eyebrow">معاينة داخلية</span>
                  <h2>سجلات التصميم والمراجعة</h2>
                </div>
                <span>لا تظهر كمنتجات منشورة</span>
              </div>
              {filteredPreview.length ? (
                <Cards
                  items={filteredPreview}
                  returnTo={page.path}
                  onNavigate={rememberListingPosition}
                />
              ) : (
                <div className="directory-state compact" role="status">
                  <h3>لا توجد سجلات معاينة تطابق الفلاتر</h3>
                  <p>امسح أحد الفلاتر أو غيّر كلمات البحث.</p>
                </div>
              )}
            </div>
          )}
          <EmptyState />
        </section>
      </div>
    </>
  );
}
function EmptyState() {
  return (
    <div className="state-demo">
      <div>
        <b>حالة التحميل</b>
        <span className="skeleton" />
      </div>
      <div>
        <b>لا توجد نتائج</b>
        <p>جرّب إزالة أحد الفلاتر أو تعديل كلمات البحث.</p>
      </div>
      <div>
        <b>بيانات ناقصة</b>
        <p>نعرض «غير متوفر» بدلاً من التخمين.</p>
      </div>
    </div>
  );
}
function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">دليل القهوة المستقل في بغداد</span>
          <h1>
            اختيار أوضح.
            <br />
            <em>فنجان أقرب لذوقك.</em>
          </h1>
          <p>
            ابدأ من ذوقك، قارن البيانات، واعرف أين تجد القهوة والمعدات لدى جهات
            تمت مراجعتها.
          </p>
          <div className="hero-actions">
            <Link className="primary" href="/coffee/finder">
              ساعدني أختار
            </Link>
            <Link className="secondary" href="/coffee">
              استكشف القهوة
            </Link>
          </div>
          <div className="trust">
            <span>
              <Icon name="check" /> بيانات منظمة
            </span>
            <span>
              <Icon name="check" /> مصادر وتواريخ تحقق
            </span>
            <span>
              <Icon name="check" /> صفحات بائع داخل المنصة
            </span>
          </div>
        </div>
        <div className="hero-photo">
          <img
            src="https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=85"
            alt="تحضير قهوة مختصة"
            fetchPriority="high"
            decoding="async"
          />
          <div className="float-card">
            <small>اقتراح اليوم</small>
            <b>إثيوبيا قوجي</b>
            <span>فاكهية · فلتر · 94% توافق</span>
          </div>
        </div>
      </section>
      <section className="quick">
        <Link href="/coffee">
          <Icon name="coffee" />
          <b>أريد قهوة</b>
          <span>حسب الطريقة والنكهة</span>
        </Link>
        <Link href="/equipment">
          <Icon name="gear" />
          <b>أبحث عن معدات</b>
          <span>مقارنة مواصفات مفيدة</span>
        </Link>
        <Link href="/directory">
          <Icon name="place" />
          <b>أكتشف جهة</b>
          <span>محامص ومقاهٍ وموردون</span>
        </Link>
        <Link href="/knowledge">
          <Icon name="learn" />
          <b>أريد أن أتعلم</b>
          <span>أدلة مرتبطة بالمنتجات</span>
        </Link>
      </section>
      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">منتقاة لك</span>
            <h2>قهوة تبدأ منها بثقة</h2>
          </div>
          <Link href="/coffee">عرض الكل ←</Link>
        </div>
        <Cards />
      </section>
      <section className="band">
        <div>
          <span className="eyebrow light">مكائن التحميص ضمن V1</span>
          <h2>من العينة إلى الإنتاج التجاري</h2>
          <p>
            قارن السعة والطاقة والتحكم والتركيب والصيانة، ثم تواصل مع المورد.
          </p>
          <Link href="/equipment/roasting-machines">استكشف مكائن التحميص</Link>
        </div>
      </section>
    </>
  );
}
function Families({ page }: { page: PageDef }) {
  const list: Array<{ label: string; href: string }> =
    page.path === "/equipment"
      ? [
          { label: families[0], href: "/equipment/grinders" },
          { label: families[1], href: "/equipment/brew-tools" },
          { label: families[2], href: "/equipment/brew-machines" },
          { label: families[3], href: "/equipment/roasting-machines" },
          { label: families[4], href: "/equipment/care" },
        ]
      : page.path.includes("brew-tools")
        ? [
            { label: "أدوات التقطير", href: "/equipment/brew-tools/drippers" },
            { label: "الغلايات", href: "/equipment/brew-tools/kettles" },
            { label: "الموازين", href: "/equipment/brew-tools/scales" },
            { label: "الفلاتر", href: "/equipment/brew-tools/filters" },
            { label: "أوعية التقديم", href: "/equipment/brew-tools/servers" },
            { label: "المؤقتات", href: "/equipment/brew-tools/timers" },
          ]
        : page.path.includes("brew-machines")
          ? [
              { label: "مكائن الإسبريسو", href: "/equipment/brew-machines/espresso" },
              { label: "مكائن القهوة المقطرة", href: "/equipment/brew-machines/filter" },
              { label: "مكائن الكبسولات", href: "/equipment/brew-machines/capsule" },
            ]
          : [
              { label: "معالجة المياه", href: "/equipment/care/water" },
              { label: "مواد التنظيف", href: "/equipment/care/cleaning" },
              { label: "قطع الصيانة", href: "/equipment/care/parts" },
              { label: "منظمات ركن القهوة", href: "/equipment/care/organizers" },
            ];
  return (
    <>
      <div className="family-grid">
        {list.map((item, i) => (
          <Link href={item.href} key={item.href}>
            <span>0{i + 1}</span>
            <Icon name="gear" />
            <h3>{item.label}</h3>
            <p>تصنيف واضح، مواصفات عملية، وفلاتر مرتبطة بقرار الشراء.</p>
          </Link>
        ))}
      </div>
      <section className="section">
        <h2>منتجات بارزة</h2>
        <Cards type="equipment" />
      </section>
    </>
  );
}
type FinderKey = "method" | "milk" | "flavor" | "form";
type FinderAnswers = Partial<Record<FinderKey, string>>;
type FinderProfile = {
  item: CatalogItem;
  methods: string[];
  milkUses: string[];
  flavors: string[];
  forms: string[];
  published: boolean;
};
type FinderMatch = FinderProfile & {
  score: number;
  reasons: string[];
  missing: string[];
};

const finderQuestions: Array<{
  key: FinderKey;
  question: string;
  options: Array<{ value: string; label: string; hint: string }>;
}> = [
  {
    key: "method",
    question: "أي نوع قهوة تفضل؟",
    options: [
      { value: "filter", label: "فلتر", hint: "V60 وأدوات التقطير" },
      { value: "espresso", label: "إسبريسو", hint: "صافي أو مشروبات حليب" },
      { value: "turkish", label: "تركية", hint: "طحن ناعم وتحضير تركي" },
      { value: "unsure", label: "لست متأكداً", hint: "نعطي أولوية لبقية إجاباتك" },
    ],
  },
  {
    key: "milk",
    question: "كيف تحب أن تشربها؟",
    options: [
      { value: "without", label: "بدون حليب", hint: "نكهات القهوة أوضح" },
      { value: "with", label: "مع الحليب", hint: "لاتيه وكابتشينو" },
      { value: "both", label: "الاثنان", hint: "خيارات مرنة" },
    ],
  },
  {
    key: "flavor",
    question: "ما النكهة المفضلة؟",
    options: [
      { value: "fruity", label: "فاكهية", hint: "حمضيات وتوت وفواكه" },
      { value: "floral_tea", label: "زهرية وشاي", hint: "عطرية وخفيفة" },
      { value: "chocolate_cocoa", label: "شوكولاتة وكاكاو", hint: "غنية ومألوفة" },
      { value: "nutty", label: "مكسرات", hint: "لوز وبندق" },
      { value: "sweet_caramel", label: "متوازنة وحلوة", hint: "كراميل وحلاوة واضحة" },
    ],
  },
  {
    key: "form",
    question: "ما طبيعة القهوة؟",
    options: [
      { value: "whole", label: "حبوب كاملة", hint: "تطحنها وقت التحضير" },
      { value: "ground", label: "مطحونة", hint: "جاهزة للطريقة المحددة" },
    ],
  },
];

const finderPreviewProfiles: FinderProfile[] = [
  {
    item: coffees[0],
    methods: ["filter"],
    milkUses: ["without", "both"],
    flavors: ["fruity", "floral_tea", "chocolate_cocoa"],
    forms: ["whole"],
    published: false,
  },
  {
    item: coffees[1],
    methods: ["filter", "espresso"],
    milkUses: ["without", "with", "both"],
    flavors: ["sweet_caramel", "fruity"],
    forms: ["whole"],
    published: false,
  },
  {
    item: coffees[2],
    methods: ["espresso"],
    milkUses: ["with", "both"],
    flavors: ["chocolate_cocoa", "nutty"],
    forms: ["ground"],
    published: false,
  },
];

const finderAnswerLabels = Object.fromEntries(
  finderQuestions.flatMap((question) =>
    question.options.map((option) => [option.value, option.label]),
  ),
);

function finderAttributeValues(product: PublicProduct, code: string) {
  const attribute = product.product_attribute_values.find(
    (value) => value.field_definitions?.code === code,
  );
  if (!attribute) return [];
  if (Array.isArray(attribute.value_json))
    return attribute.value_json.map(String);
  if (attribute.value_text)
    return attribute.value_text
      .split(/[|,]/)
      .map((value) => value.trim())
      .filter(Boolean);
  return [];
}

function toFinderProfile(product: PublicProduct): FinderProfile {
  const methods = Array.from(
    new Set(
      [
        ...finderAttributeValues(product, "brew_methods"),
        ...finderAttributeValues(product, "roast_purpose"),
      ].flatMap((value) =>
        value === "omni" ? ["filter", "espresso"] : [value],
      ),
    ),
  );
  const flavors = finderAttributeValues(product, "flavor_family");
  const espressoFriendly =
    methods.includes("espresso") ||
    flavors.some((value) =>
      ["chocolate_cocoa", "nutty", "sweet_caramel"].includes(value),
    );
  return {
    item: toCatalogItem(product),
    methods,
    milkUses: espressoFriendly
      ? ["with", "without", "both"]
      : ["without", "both"],
    flavors,
    forms: finderAttributeValues(product, "coffee_form"),
    published: true,
  };
}

function scoreFinderProfile(
  profile: FinderProfile,
  answers: FinderAnswers,
): FinderMatch {
  let score = 0;
  const reasons: string[] = [];
  const missing: string[] = [];
  if (answers.method === "unsure") {
    score += 40;
    reasons.push("طريقة التحضير مفتوحة حسب اختيارك");
  } else if (answers.method && profile.methods.includes(answers.method)) {
    score += 40;
    reasons.push(`مناسبة لـ${finderAnswerLabels[answers.method]}`);
  } else if (!profile.methods.length) missing.push("طريقة التحضير");

  if (answers.milk && profile.milkUses.includes(answers.milk)) {
    score += 20;
    reasons.push(`تلائم الشرب ${finderAnswerLabels[answers.milk]}`);
  }
  if (answers.flavor && profile.flavors.includes(answers.flavor)) {
    score += 30;
    reasons.push(`ضمن عائلة ${finderAnswerLabels[answers.flavor]}`);
  } else if (!profile.flavors.length) missing.push("عائلة النكهة");

  if (answers.form && profile.forms.includes(answers.form)) {
    score += 10;
    reasons.push(`متوفرة بصيغة ${finderAnswerLabels[answers.form]}`);
  } else if (!profile.forms.length) missing.push("شكل القهوة");

  return { ...profile, score, reasons, missing };
}

function FinderMatches({
  title,
  eyebrow,
  matches,
}: {
  title: string;
  eyebrow: string;
  matches: FinderMatch[];
}) {
  return (
    <section className="finder-match-section">
      <div className="section-head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <span>{matches.length} نتيجة</span>
      </div>
      <div className="finder-matches">
        {matches.map((match) => (
          <article key={match.item.id}>
            <div className="finder-score" aria-label={`درجة المطابقة ${match.score} بالمئة`}>
              {match.score}%
            </div>
            <div>
              <div className="badges">
                <span>{match.published ? "منشور" : "معاينة داخلية"}</span>
                <span>{match.item.reviewLabel || "سجل تصميم"}</span>
              </div>
              <h3>{match.item.name}</h3>
              <p>{match.item.meta}</p>
              <ul>
                {match.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {match.missing.length > 0 && (
                <small>بيانات ناقصة: {match.missing.join("، ")}</small>
              )}
            </div>
            <Link href={match.item.href}>عرض التفاصيل ←</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

function Finder() {
  const status = usePlatformStatus();
  const published = usePublicProducts(
    "COF-ROASTED",
    undefined,
    "roasted_coffee",
  );
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<FinderAnswers>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("coffee-platform-v1-finder");
        const parsed = saved ? (JSON.parse(saved) as FinderAnswers) : {};
        const restoredAnswers =
          parsed.method === "turkish"
            ? { ...parsed, form: "ground" }
            : parsed;
        setAnswers(restoredAnswers);
        if (restoredAnswers.method === "turkish") {
          setStep(finderQuestions.length);
          setReady(true);
          return;
        }
        const firstMissing = finderQuestions.findIndex(
          (question) => !restoredAnswers[question.key],
        );
        setStep(firstMissing === -1 ? finderQuestions.length : firstMissing);
      } catch {
        setAnswers({});
        setStep(0);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);

  useEffect(() => {
    if (ready)
      localStorage.setItem(
        "coffee-platform-v1-finder",
        JSON.stringify(answers),
      );
  }, [answers, ready]);

  const reset = () => {
    setAnswers({});
    setStep(0);
    localStorage.removeItem("coffee-platform-v1-finder");
  };

  if (step >= finderQuestions.length) {
    const publishedMatches = published.products
      .map(toFinderProfile)
      .map((profile) => scoreFinderProfile(profile, answers))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    const previewMatches = finderPreviewProfiles
      .map((profile) => scoreFinderProfile(profile, answers))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    const bestScore = publishedMatches[0]?.score || previewMatches[0]?.score || 0;
    return (
      <div className="finder-result">
        <span className="score">{bestScore}%</span>
        <h2>هذه أقرب الخيارات إلى تفضيلاتك</h2>
        <div className="finder-answer-summary">
          {finderQuestions.map((question) => (
            <span key={question.key}>
              {finderAnswerLabels[answers[question.key] || ""] || "غير محدد"}
            </span>
          ))}
        </div>
        <p className="finder-rule-note">
          درجة المطابقة ناتجة عن طريقة التحضير 40%، الحليب 20%، النكهة 30%،
          وشكل القهوة 10%. البيانات الناقصة لا تُخمن.
        </p>
        {published.loading ? (
          <div className="directory-state" role="status">
            جارٍ فحص القهوة المنشورة…
          </div>
        ) : publishedMatches.length ? (
          <FinderMatches
            eyebrow="الدليل المنشور"
            title="نتائج قابلة للاكتشاف"
            matches={publishedMatches}
          />
        ) : (
          <div className="directory-state compact">
            <h3>لا توجد قهوة محمصة منشورة للمطابقة بعد</h3>
            <p>
              {published.connected
                ? "محرك المطابقة جاهز، وسيعرض المنتجات تلقائياً بعد اعتماد بياناتها."
                : "تعذر الاتصال ببيانات المنتجات المنشورة الآن."}
            </p>
          </div>
        )}
        {status?.publicLaunch !== true && (
          <FinderMatches
            eyebrow="معاينة داخلية"
            title="اختبار منطق المطابقة على سجلات التصميم"
            matches={previewMatches}
          />
        )}
        <button className="primary" type="button" onClick={reset}>
          إعادة الاختيار
        </button>
      </div>
    );
  }

  const question = finderQuestions[step];
  return (
    <div className="finder">
      <div className="progress" aria-hidden="true">
        <span style={{ width: `${((step + 1) / finderQuestions.length) * 100}%` }} />
      </div>
      <small>
        السؤال {step + 1} من {finderQuestions.length}
      </small>
      <h2>{question.question}</h2>
      <div className="answer-grid">
        {question.options.map((option) => (
          <button
            type="button"
            key={option.value}
            onClick={() => {
              if (question.key === "method" && option.value === "turkish") {
                setAnswers({ ...answers, method: "turkish", form: "ground" });
                setStep(finderQuestions.length);
                return;
              }
              setAnswers({ ...answers, [question.key]: option.value });
              setStep(step + 1);
            }}
          >
            <span>
              <b>{option.label}</b>
              <small>{option.hint}</small>
            </span>
            <span>←</span>
          </button>
        ))}
      </div>
      {step > 0 && (
        <button
          className="back"
          type="button"
          onClick={() => {
            const previous = finderQuestions[step - 1].key;
            const next = { ...answers };
            delete next[previous];
            setAnswers(next);
            setStep(step - 1);
          }}
        >
          الرجوع للسؤال السابق
        </button>
      )}
    </div>
  );
}
function Detail({ page }: { page: PageDef }) {
  const roast = page.kind === "roaster-detail";
  const grinder = page.kind === "product";
  const jUltra = page.path.includes("1zpresso-j-ultra");
  const item = roast
    ? equipment[1]
    : grinder
      ? jUltra
        ? equipment[2]
        : equipment[0]
      : coffees[0];
  const favorites = useStoredItems("coffee-platform-v1-favorites");
  const comparison = useStoredItems("coffee-platform-v1-comparison");
  const saved = favorites.items.some((x) => x.id === item.id);
  const compared = comparison.items.some((x) => x.id === item.id);
  const blocked =
    !compared &&
    (comparison.items.length >= 4 ||
      (comparison.items.length > 0 && comparison.items[0].group !== item.group));
  const returnTo = useReturnTo(
    roast ? "/equipment/roasting-machines" : grinder ? "/equipment/grinders" : "/coffee",
  );
  return (
    <div className="detail">
      <div className="detail-return">
        <Link href={returnTo}>→ العودة إلى النتائج المحفوظة</Link>
        <span>سنعيد الفلاتر والترتيب وموضع الصفحة على هذا الجهاز.</span>
      </div>
      <div className="gallery">
        <img
          src={
            roast
              ? "https://images.unsplash.com/photo-1599639932525-213272ff954b?auto=format&fit=crop&w=1100&q=80"
              : grinder
                ? "https://images.unsplash.com/photo-1544967919-44c1ef2f9e7a?auto=format&fit=crop&w=1100&q=80"
              : "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1100&q=80"
          }
          alt={`صورة توضيحية لصفحة ${page.title}`}
          decoding="async"
        />
        <div>
          <span />
          <span />
          <span />
        </div>
      </div>
      <div className="detail-copy">
        <div className="badges">
          <span>{item.reviewLabel || "نموذج بيانات V1"}</span>
          <span>غير منشور</span>
        </div>
        <h2>{page.title}</h2>
        <p>{page.desc}</p>
        <div className="keyfacts">
          {(roast
            ? [
                "سعة الدفعة القصوى: 3 كغم",
                "الإنتاج المعلن: حتى 12 كغم/ساعة",
                "الطاقة: غاز طبيعي أو LPG",
                "السوق المحلي: غير موثق بعد",
              ]
            : grinder
              ? jUltra
                ? [
                    "التشغيل: يدوي",
                    "الشفرات: مخروطية 48 مم",
                    "الضبط: 8 ميكرون لكل نقرة",
                    "الاستخدام الأساسي: إسبريسو",
                  ]
                : [
                    "التشغيل: كهربائي",
                    "الشفرات: مسطحة 54 مم",
                    "الضبط: تدريجي دون درجات",
                    "التغذية: جرعة مفردة",
                  ]
            : [
                "الاستخدام: فلتر",
                "المنشأ: إثيوبيا — قوجي",
                "المعالجة: طبيعية",
                "الإيحاءات: توت وكاكاو",
              ]
          ).map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
        <div className="offer-box">
          <div>
            <small>{roast ? "حالة العرض في بغداد" : grinder ? "عرض مرصود غير منشور" : "عرض توضيحي غير منشور"}</small>
            <b>{roast ? "لا يوجد عرض محلي موثق" : item.price}</b>
            <span>{roast ? "يلزم توثيق المورد والتركيب والضمان والصيانة" : grinder ? "السعر والتوفر يعاد التحقق منهما عند الاعتماد" : "يُستبدل ببيانات موثقة عند اعتمادها"}</span>
          </div>
          <Link
            className="primary"
            href={
              roast
                ? "/directory/equipment-suppliers"
                : grinder
                  ? "/directory/equipment-suppliers"
                : "/coffee/sumer-ethiopia/offers"
            }
          >
            مشاهدة نموذج التوفر
          </Link>
        </div>
        <div className="detail-actions">
          <button
            className="secondary"
            aria-pressed={saved}
            onClick={() =>
              favorites.setItems(toggleItem(favorites.items, item))
            }
          >
            {saved ? "محفوظ في المفضلة ✓" : "حفظ في المفضلة"}
          </button>
          <button
            className="secondary"
            disabled={blocked}
            aria-pressed={compared}
            onClick={() =>
              comparison.setItems(toggleItem(comparison.items, item))
            }
          >
            {compared
              ? "مضاف للمقارنة ✓"
              : comparison.items.length >= 4
                ? "اكتمل الحد الأقصى للمقارنة"
              : blocked
                ? "المقارنة لنفس النوع فقط"
                : "إضافة للمقارنة"}
          </button>
        </div>
      </div>
      <section className="specs">
        <h2>المواصفات والبيانات</h2>
        <table>
          <tbody>
            {(roast
              ? [
                  ["النموذج", "Kuban Supreme 3"],
                  ["سعة الدفعة القصوى", "3 كغم"],
                  ["الإنتاج المعلن", "حتى 12 كغم/ساعة"],
                  ["مصدر الطاقة", "غاز طبيعي أو LPG حسب التجهيز"],
                  ["التغذية الكهربائية", "220–380 V · 50–60 Hz"],
                  ["الأبعاد", "1040 × 1220 × 1670 مم"],
                  ["الوزن", "310 كغم"],
                  ["العرض المحلي", "غير موثق في بغداد"],
                ]
              : grinder
                ? jUltra
                  ? [
                      ["النموذج", "1Zpresso J-Ultra"],
                      ["نمط التشغيل", "يدوي"],
                      ["الشفرات", "مخروطية 48 مم"],
                      ["الضبط", "متدرج · 8 ميكرون لكل نقرة"],
                      ["السعة الرسمية", "35–40 غ"],
                      ["الوزن الرسمي", "670 غ"],
                      ["السعر المرصود", "438,000 د.ع"],
                    ]
                  : [
                      ["النموذج", "DF54 V4"],
                      ["نمط التشغيل", "كهربائي"],
                      ["الشفرات", "مسطحة 54 مم"],
                      ["الضبط", "تدريجي دون درجات"],
                      ["سعة القادوس", "25 غ"],
                      ["القدرة", "150 واط"],
                      ["السعر المرصود", "325,250 د.ع"],
                    ]
              : [
                  ["نوع القهوة", "أرابيكا"],
                  ["درجة التحميص", "فاتحة إلى متوسطة"],
                  ["طريقة المعالجة", "طبيعية"],
                  ["الارتفاع", "1,900–2,100 م"],
                  ["السلالة", "بحسب بيانات المحمصة"],
                  ["تاريخ التحميص", "يظهر على العبوة"],
                ]
            ).map((r) => (
              <tr key={r[0]}>
                <th>{r[0]}</th>
                <td>{r[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="source-note">
          <b>حالة المصدر</b>
          <p>
            {roast
              ? "المواصفات مرتبطة بمصدر المصنّع بتاريخ 9 أغسطس 2026، لكن المنتج ما زال قيد المراجعة ولا يظهر في الدليل المنشور."
              : grinder
                ? "هذا سجل موثق المصدر وقيد المراجعة. السعر المرصود ليس دليلاً على المخزون ولا يظهر للعامة قبل الاعتماد."
                : "هذه بيانات توضيحية للتصميم وليست سجلاً منشوراً. لا تتحول إلى موثقة إلا بعد إدخال المصدر وتاريخ التحقق واعتماد المحرر."}
          </p>
        </div>
      </section>
    </div>
  );
}
function Directory({ page }: { page: PageDef }) {
  const directory = usePublicDirectory();
  const status = usePlatformStatus();
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  if (page.kind === "org") return <Org />;
  const wanted = page.path.endsWith("/roasters")
    ? "roaster"
    : page.path.endsWith("/cafes")
      ? "cafe"
      : page.path.endsWith("/equipment-suppliers")
        ? "equipment_supplier"
        : page.path.endsWith("/sellers")
          ? "seller"
          : null;
  const normalizedQuery = normalizeSearchText(query);
  const selectedRole = wanted || roleFilter || null;
  const roleMatches = (roles: string[]) => !selectedRole || roles.includes(selectedRole);
  const publicRows = selectedRole
    ? directory.organizations.filter((organization) =>
        organization.organization_roles.some(
          (role) => role.role_type === selectedRole,
        ),
      )
    : directory.organizations;
  const publishedOrganizationSlugs = new Set(
    directory.organizations.map((organization) => organization.slug),
  );
  const unpublishedReviewOrganizations = reviewOrganizations.filter(
    (organization) => !publishedOrganizationSlugs.has(organization.slug),
  );
  const rows = publicRows.filter((organization) => {
    const searchable = [
      organization.name_ar,
      organization.name_en,
      organization.description_ar,
      ...organization.locations.flatMap((location) => [
        directoryLocationArea(location),
        location.address_ar,
      ]),
    ]
      .filter(Boolean)
      .join(" ");
    return (
      (!normalizedQuery || normalizeSearchText(searchable).includes(normalizedQuery)) &&
      (!district ||
        organization.locations.some(
          (location) => directoryLocationArea(location) === district,
        ))
    );
  });
  const previewRows = unpublishedReviewOrganizations.filter((organization) => {
    const searchable = [
      organization.nameAr,
      organization.nameEn,
      ...organization.districts,
    ].join(" ");
    return (
      roleMatches(organization.roles) &&
      (!normalizedQuery || normalizeSearchText(searchable).includes(normalizedQuery)) &&
      (!district || organization.districts.includes(district))
    );
  });
  const districts = directory.loading
    ? []
    : Array.from(
        new Set(
          [
            ...publicRows.flatMap((organization) =>
              organization.locations
                .map(directoryLocationArea)
                .filter((value): value is string => Boolean(value)),
            ),
            ...unpublishedReviewOrganizations
              .filter((organization) => roleMatches(organization.roles))
              .flatMap((organization) => organization.districts),
          ],
        ),
      ).sort((a, b) => a.localeCompare(b, "ar"));
  return (
    <>
      <div className="mapbox">
        <div>
          <span className="eyebrow">تغطية بغداد</span>
          <h2>جهات منشورة بعد اكتمال المراجعة</h2>
          <p>
            لا تظهر أي جهة لمجرد إدخالها. النشر يتطلب حالة «منشور» ومصدر تحقق
            محفوظاً.
          </p>
        </div>
        <div className="mapdots">
          <i />
          <i />
          <i />
          <i />
          <b>بغداد</b>
        </div>
      </div>
      <div className="directory-controls">
        {!wanted && <label>
          نوع الجهة
          <select value={roleFilter} disabled={directory.loading} onChange={(event) => { setRoleFilter(event.target.value); setDistrict(""); }}>
            <option value="">كل الجهات</option>
            <option value="cafe">المقاهي</option><option value="roaster">المحامص</option><option value="seller">البائعون والمتاجر</option><option value="equipment_supplier">موردو المعدات</option><option value="manufacturer">المصنّعون</option><option value="importer">المستوردون</option><option value="service_provider">التعليم والتدريب والخدمات</option>
          </select>
        </label>}
        <label>
          بحث داخل الدليل
          <input
            type="search"
            value={query}
            placeholder="اسم الجهة أو المنطقة"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          المنطقة
          <select
            value={district}
            disabled={directory.loading}
            onChange={(event) => setDistrict(event.target.value)}
          >
            <option value="">
              {directory.loading ? "جارٍ تحميل المناطق…" : "كل مناطق بغداد"}
            </option>
            {districts.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setDistrict("");
            if (!wanted) setRoleFilter("");
          }}
        >
          مسح
        </button>
        <p aria-live="polite">
          {directory.loading
            ? "جارٍ احتساب السجلات المنشورة وقيد المراجعة…"
            : `${rows.length} منشورة · ${previewRows.length} قيد المراجعة`}
        </p>
      </div>
      {directory.loading ? (
        <div className="directory-state" role="status">
          <span className="skeleton" />
          <span className="skeleton" />
          <p>جارٍ تحميل الدليل المنشور…</p>
        </div>
      ) : rows.length ? (
        <div className="orgcards">
          {rows.map((organization) => {
            const branches = organizationBranchSummary(
              organization.locations,
            );
            return (
              <Link
                href={`/directory/${organization.slug}`}
                key={organization.id}
              >
                <div className="avatar">{organization.name_ar[0]}</div>
                <div>
                  <div className="badges">
                    <span>
                      {organizationVerificationLabel(
                        organization.verification_tier,
                      )}
                    </span>
                    <span>
                      {organization.organization_roles
                        .map((role) => organizationRoleLabel(role.role_type))
                        .join(" · ")}
                    </span>
                  </div>
                  <h3>{organization.name_ar}</h3>
                  <p
                    className="directory-branch-summary"
                    aria-label={`${branches.countLabel}: ${branches.names.join("، ")}`}
                  >
                    <strong>{branches.countLabel}</strong>
                    {branches.names.length > 0 && (
                      <span>{branches.names.join(" · ")}</span>
                    )}
                  </p>
                </div>
                <span>←</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="directory-state">
          <Icon name="place" />
          <h3>لا توجد جهات منشورة في هذا القسم بعد</h3>
          <p>
            {directory.connected
              ? "الدفعة الحالية محفوظة للمراجعة ولن تظهر قبل اعتمادها."
              : "تعذر الاتصال بالدليل الآن. لم نعرض بيانات بديلة أو غير موثقة."}
          </p>
        </div>
      )}
      {!directory.loading && status?.publicLaunch !== true && (
        <section className="directory-review-preview">
          <div className="section-head">
            <div>
              <span className="eyebrow">معاينة داخلية</span>
              <h2>جهات بغداد قيد المراجعة</h2>
            </div>
            <span>لا تظهر في الدليل المنشور</span>
          </div>
          {previewRows.length ? (
            <div className="orgcards review-orgcards">
              {previewRows.map((organization) => (
                <Link
                  href={`/directory/review/${organization.slug}`}
                  key={organization.id}
                >
                  <div className="avatar">{organization.nameAr[0]}</div>
                  <div>
                    <div className="badges">
                      <span>
                        {organization.decision === "held"
                          ? "معلّقة"
                          : "قيد المراجعة"}
                      </span>
                      <span>
                        {organization.roles
                          .map((role) => organizationRoleLabels[role] || role)
                          .join(" · ")}
                      </span>
                    </div>
                    <h3>{organization.nameAr}</h3>
                    <p>
                      {organization.districts.join(" · ") ||
                        "موقع بغداد غير مثبت"}
                    </p>
                  </div>
                  <span>←</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="directory-state compact">
              <h3>لا توجد جهات مراجعة تطابق البحث</h3>
              <p>غيّر الاسم أو المنطقة، أو امسح الفلاتر.</p>
            </div>
          )}
        </section>
      )}
    </>
  );
}
function Org() {
  return (
    <div className="org-page">
      <div className="org-cover">
        <img
          src="https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=1500&q=80"
          alt="صورة توضيحية لنموذج صفحة جهة"
          loading="lazy"
          decoding="async"
        />
        <div className="org-logo">س</div>
      </div>
      <div className="org-title">
        <div>
          <div className="badges">
            <span>نموذج صفحة جهة</span>
            <span>غير منشور</span>
          </div>
          <h2>محمصة سومر</h2>
          <p>محتوى توضيحي لا يمثل جهة منشورة في الدليل حتى اكتمال الاعتماد.</p>
        </div>
        <Link className="primary" href="/directory/sumer/branches">
          الفروع والتواصل
        </Link>
      </div>
      <div className="tabs">
        <button>نظرة عامة</button>
        <button>القهوة</button>
        <button>الفروع</button>
        <button>بيانات التحقق</button>
      </div>
      <section className="section">
        <h2>قهوة من هذه المحمصة</h2>
        <Cards />
      </section>
      <div className="rights-box">
        <b>هل تمثل هذه الجهة؟</b>
        <p>يمكنك طلب تصحيح معلومة أو المطالبة بإدارة الصفحة بعد التحقق.</p>
        <Link href="/rights/claim">المطالبة بالصفحة</Link>
      </div>
    </div>
  );
}

function PublishedOrganization({ slug }: { slug: string }) {
  const directory = usePublicDirectory();
  const catalog = usePublicProducts();
  const [sellerQuery, setSellerQuery] = useState("");
  const [sellerKind, setSellerKind] = useState("all");
  const organization = directory.organizations.find((item) => item.slug === slug);

  if (directory.loading)
    return (
      <div className="directory-state" role="status">
        <span className="skeleton" />
        <p>جارٍ تحميل صفحة الجهة المنشورة…</p>
      </div>
    );

  if (!organization)
    return (
      <div className="directory-state">
        <Icon name="place" />
        <h2>هذه الجهة غير منشورة</h2>
        <p>
          لم نعثر على سجل منشور بهذا الرابط. قد يكون السجل قيد المراجعة أو أُرشف
          لحين تحديث بياناته.
        </p>
        <Link className="primary" href="/directory">
          العودة إلى دليل بغداد
        </Link>
      </div>
    );

  const branches = organizationBranchSummary(organization.locations);
  const sortedLocations = [...organization.locations].sort((a, b) => {
    const aName = a.name_ar || a.district_ar || a.address_ar;
    const bName = b.name_ar || b.district_ar || b.address_ar;
    return aName.localeCompare(bName, "ar");
  });
  const sellerProducts = catalog.products.flatMap((product) => product.offers.filter((offer) => offer.organizations?.slug === organization.slug).map((offer) => ({ product, offer })));
  const visibleSellerProducts = sellerProducts.filter(({ product }) => (sellerKind === "all" || product.product_kind === sellerKind) && (!sellerQuery.trim() || `${product.name_ar} ${product.name_en || ""} ${product.brands?.name_ar || ""}`.toLocaleLowerCase("ar-IQ").includes(sellerQuery.trim().toLocaleLowerCase("ar-IQ"))));

  return (
    <div className="org-page published-org">
      {organization.media?.[0] && <div className="published-org-media"><img src={organization.media[0].url} alt={organization.media[0].alt_ar} /></div>}
      <div className="org-title">
        <div>
          <div className="badges">
            <span>{organizationVerificationLabel(organization.verification_tier)}</span>
            <span>سجل منشور</span>
          </div>
          <h1>{organization.name_ar}</h1>
          {organization.name_en && <p lang="en">{organization.name_en}</p>}
          <p>{organization.description_ar || "لا يتوفر وصف معتمد لهذه الجهة حالياً."}</p>
        </div>
      </div>
      <section className="section seller-catalog seller-catalog-priority">
        <div className="section-head"><div><span className="eyebrow">متجر البائع داخل قهوتنا</span><h2>المنتجات والعروض</h2></div><span>{sellerProducts.length} عرض منشور</span></div>
        {sellerProducts.length > 0 && <div className="seller-catalog-toolbar"><label>قسم المنتجات<select value={sellerKind} onChange={(event) => setSellerKind(event.target.value)}><option value="all">كل المنتجات</option><option value="roasted_coffee">القهوة</option><option value="equipment">المعدات</option><option value="consumable">المستهلكات</option><option value="care_product">العناية والصيانة</option><option value="replacement_part">قطع الغيار</option></select></label><label>البحث داخل صفحة البائع<input value={sellerQuery} onChange={(event) => setSellerQuery(event.target.value)} placeholder="اسم المنتج أو العلامة" /></label></div>}
        {catalog.loading ? <p>جارٍ تحميل عروض الجهة…</p> : sellerProducts.length ? <>{visibleSellerProducts.length ? <div className="seller-product-grid">{visibleSellerProducts.map(({ product, offer }) => { const image = offer.media?.[0] || product.media?.[0]; return <Link key={offer.id} href={`/directory/${organization.slug}/products/${product.slug}`}><div>{image ? <img src={image.url} alt={image.alt_ar} /> : <Icon name={product.product_kind === "roasted_coffee" ? "coffee" : "gear"} />}</div><b>{product.name_ar}</b><span>{formatPrice(offer.price, offer.currency_code)} · {offerAvailabilityLabel(offer.availability)}</span><small>تفاصيل عرض {organization.name_ar}</small></Link>; })}</div> : <div className="directory-state compact"><h3>لا توجد منتجات مطابقة</h3><p>غيّر القسم أو عبارة البحث داخل متجر البائع.</p></div>}</> : <div className="directory-state compact"><h3>لا توجد عروض منشورة لهذه الجهة</h3><p>المنتج يظهر هنا بعد نشر سجل المنتج ونشر «عرض وسعر» يربطه بهذه الجهة. تسجيل الجهة كمالك للمنتج لا يُعد عرضاً للبيع.</p></div>}
      </section>
      <section className="section">
        <h2>الأدوار والخدمات</h2>
        <div className="chips">
          {organization.organization_roles.map((role) => (
            <span key={role.role_type}>{organizationRoleLabel(role.role_type)}</span>
          ))}
        </div>
      </section>
      <section className="section branches">
        <div className="section-head branch-section-head">
          <h2>المواقع المنشورة</h2>
          <span>{branches.countLabel}</span>
        </div>
        {organization.locations.length ? (
          sortedLocations.map((location) => (
            <article key={location.id}>
              <b>{location.name_ar || location.district_ar || "بغداد"}</b>
              <p>{location.address_ar}</p>
            </article>
          ))
        ) : (
          <p>لا يتوفر عنوان منشور لهذه الجهة حالياً.</p>
        )}
      </section>
      <section className="section seller-contact-details">
        <div className="section-head"><h2>معلومات الجهة والتواصل</h2><span>معلومات ثانوية</span></div>
        <p>التصفح والعروض يبقيان داخل قهوتنا. معلومات التواصل أو الموقع الرسمي تظهر هنا كمرجع إضافي فقط.</p>
        <div className="detail-actions">{organization.phone && <a className="secondary" href={`tel:${organization.phone}`}>{organization.phone}</a>}{!organization.phone && <span>لا توجد معلومات تواصل منشورة حالياً.</span>}</div>
        {organization.website_url && <small className="internal-commerce-note">الموقع الخارجي محفوظ كمصدر تحقق لدى الإدارة، بينما استعراض المنتجات والعروض يتم داخل صفحة البائع في قَهوتنا.</small>}
      </section>
      <div className="rights-box">
        <b>هل تمثل هذه الجهة أو لاحظت معلومة غير دقيقة؟</b>
        <p>يمكنك طلب التصحيح أو المطالبة بالصفحة، ولن يتغير السجل تلقائياً.</p>
        <Link href="/rights/correction">طلب تصحيح</Link>
      </div>
    </div>
  );
}

function PublishedSellerOffer({ sellerSlug, productSlug }: { sellerSlug: string; productSlug: string }) {
  const state = usePublicProducts(undefined, productSlug);
  const product = state.products[0];
  const offer = product?.offers.find((item) => item.organizations?.slug === sellerSlug);
  if (state.loading) return <div className="directory-state" role="status"><span className="skeleton" /><p>جارٍ تحميل عرض البائع…</p></div>;
  if (!product || !offer) return <div className="directory-state"><Icon name="gear" /><h2>هذا العرض غير منشور</h2><p>لم نعثر على ربط منشور بين المنتج والبائع المحددين.</p><Link className="primary" href={`/directory/${sellerSlug}`}>العودة إلى صفحة البائع</Link></div>;
  const offerDisplayMedia = offer.media?.length ? offer.media : product.media;
  const primaryCategory = product.product_categories.find((relation) => relation.is_primary)?.categories || product.product_categories[0]?.categories;
  const attributes = product.product_attribute_values.filter((value) => value.field_definitions).map((value) => [value.field_definitions?.name_ar || "مواصفة", attributeDisplayValue(value)]);
  const masterPath = `/${product.product_kind === "roasted_coffee" ? "coffee" : "equipment"}/${product.slug}`;
  return <div className="published-product seller-offer-page">
    <div className="detail-return"><Link href={`/directory/${sellerSlug}`}>→ العودة إلى منتجات {offer.organizations?.name_ar}</Link><span>هذه صفحة عرض البائع، وليست سجل المنتج الرئيسي.</span></div>
    <div className="crumb"><Link href="/">الرئيسية</Link><span>‹</span><Link href={`/directory/${sellerSlug}`}>{offer.organizations?.name_ar}</Link><span>‹</span><b>{product.name_ar}</b></div>
    <div className="entity-context-banner offer-context"><div><span>عرض بائع</span><h1>{product.name_ar}</h1></div><div><b>{offer.organizations?.name_ar}</b><span>معرف العرض: {offer.id}</span></div></div>
    <div className="detail">
      <MediaCarousel items={offerDisplayMedia} emptyIcon={product.product_kind === "roasted_coffee" ? "coffee" : "gear"} emptyText="لا توجد صورة خاصة بهذا العرض" sourceLabel={!offer.media?.length && product.media.length ? "صورة بطاقة المنتج الرئيسية" : undefined} />
      <div className="detail-copy"><div className="badges"><span>عرض منشور</span>{primaryCategory && <span>{primaryCategory.name_ar}</span>}</div><h2>{product.name_ar}</h2><p>{product.summary_ar || product.description_ar || "لا يتوفر وصف منشور حالياً."}</p><div className="seller-offer-price"><strong>{formatPrice(offer.price, offer.currency_code)}</strong><span>{offerAvailabilityLabel(offer.availability)}</span><small>آخر رصد: {new Intl.DateTimeFormat("ar-IQ").format(new Date(offer.observed_at))}</small></div><Link className="secondary" href={masterPath}>فتح بطاقة المنتج الرئيسية ومصادرها</Link></div>
      <section className="specs"><h2>المواصفات العامة للمنتج</h2>{attributes.length ? <table><tbody>{attributes.map(([label, value]) => <tr key={String(label)}><th>{label}</th><td>{value}</td></tr>)}</tbody></table> : <p>لا توجد مواصفات منشورة لهذا المنتج حالياً.</p>}</section>
      <section className="specs seller-offer-scope"><h2>ما الذي يخص هذا البائع؟</h2><ul><li>السعر والتوفر وتاريخ الرصد.</li><li>الصور المرفوعة على سجل العرض.</li><li>أما الاسم والموديل والعلامة والمواصفات فهي من بطاقة المنتج الرئيسية المشتركة.</li></ul></section>
    </div>
  </div>;
}

function ReviewOrganizationPage({ slug }: { slug: string }) {
  const status = usePlatformStatus();
  const organization = reviewOrganizations.find((item) => item.slug === slug);

  if (status?.publicLaunch === true || !organization)
    return (
      <div className="directory-state">
        <Icon name="place" />
        <h2>سجل المعاينة غير متاح</h2>
        <p>هذه الصفحة ليست جزءاً من الدليل المنشور.</p>
        <Link className="primary" href="/directory">
          العودة إلى دليل بغداد
        </Link>
      </div>
    );

  return (
    <div className="org-page review-org-page">
      <div className="crumb">
        <Link href="/">الرئيسية</Link>
        <span>‹</span>
        <Link href="/directory">دليل بغداد</Link>
        <span>‹</span>
        <b>{organization.nameAr}</b>
      </div>
      <div className="org-title">
        <div>
          <div className="badges">
            <span>معاينة داخلية</span>
            <span>
              {organization.decision === "held" ? "معلّقة" : "قيد المراجعة"}
            </span>
            <span>{organization.id}</span>
          </div>
          <h1>{organization.nameAr}</h1>
          <p lang="en">{organization.nameEn}</p>
          <p>
            هذا السجل موثق المصدر لكنه غير منشور، ولا يظهر في البحث أو الدليل
            العام قبل موافقة المالك.
          </p>
        </div>
        <a
          className="secondary"
          href={organization.sourceUrl}
          rel="noreferrer"
          target="_blank"
        >
          فتح مصدر التحقق
        </a>
      </div>
      {organization.note && (
        <div className="review-warning" role="note">
          <b>سبب التعليق</b>
          <p>{organization.note}</p>
        </div>
      )}
      <section className="section">
        <div className="review-facts">
          <div>
            <small>تاريخ فحص المصدر</small>
            <b>{organization.sourceCheckedAt}</b>
          </div>
          <div>
            <small>حالة النشر</small>
            <b>غير منشور</b>
          </div>
          <div>
            <small>عدد المواقع المرشحة</small>
            <b>{organization.districts.length}</b>
          </div>
        </div>
        <h2>الأدوار المرشحة</h2>
        <div className="chips">
          {organization.roles.map((role) => (
            <span key={role}>{organizationRoleLabels[role] || role}</span>
          ))}
        </div>
      </section>
      <section className="section branches">
        <h2>مواقع بغداد قيد المراجعة</h2>
        {organization.districts.length ? (
          organization.districts.map((district) => (
            <article key={district}>
              <b>{district}</b>
              <p>الموقع غير منشور حتى اكتمال الاعتماد.</p>
            </article>
          ))
        ) : (
          <div className="directory-state compact">
            <h3>لا يوجد موقع بغداد قابل للاعتماد حالياً</h3>
            <p>يتطلب السجل دليلاً رسمياً حديثاً قبل إضافته إلى الدليل.</p>
          </div>
        )}
      </section>
      <div className="rights-box">
        <b>قرار المراجعة</b>
        <p>
          لا يؤدي فتح المصدر أو هذه المعاينة إلى نشر الجهة. الاعتماد خطوة مستقلة.
        </p>
        <Link href="/rights/correction">تسجيل تصحيح</Link>
      </div>
    </div>
  );
}

function MediaCarousel({ items, emptyIcon, emptyText, sourceLabel }: { items: Array<{ id: string; url: string; alt_ar: string }>; emptyIcon: "coffee" | "gear"; emptyText: string; sourceLabel?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = Math.min(activeIndex, Math.max(items.length - 1, 0));
  const active = items[safeIndex];
  if (!active) return <div className="published-product-art" aria-label={emptyText}><Icon name={emptyIcon} /><span>{emptyText}</span></div>;
  const previous = () => setActiveIndex((safeIndex - 1 + items.length) % items.length);
  const next = () => setActiveIndex((safeIndex + 1) % items.length);
  return <div className="catalog-media-carousel">
    <div className="published-product-art has-media carousel-stage">
      <button type="button" className="carousel-image-button" onClick={items.length > 1 ? next : undefined} aria-label={items.length > 1 ? "عرض الصورة التالية" : active.alt_ar}><img src={active.url} alt={active.alt_ar} /></button>
      {items.length > 1 && <><button type="button" className="carousel-arrow previous" onClick={previous} aria-label="الصورة السابقة">→</button><button type="button" className="carousel-arrow next" onClick={next} aria-label="الصورة التالية">←</button><span className="carousel-counter">{safeIndex + 1} / {items.length}</span></>}
    </div>
    {sourceLabel && <small className="media-source-label">{sourceLabel}</small>}
    {items.length > 1 && <div className="media-carousel-thumbs">{items.map((item, index) => <button type="button" key={item.id} className={index === safeIndex ? "active" : ""} onClick={() => setActiveIndex(index)} aria-label={`عرض الصورة ${index + 1}`}><img src={item.url} alt="" /></button>)}</div>}
  </div>;
}

function PublishedProduct({
  slug,
  section,
}: {
  slug: string;
  section: "coffee" | "equipment";
}) {
  const state = usePublicProducts(undefined, slug);
  const product = state.products[0];
  const favorites = useStoredItems("coffee-platform-v1-favorites");
  const comparison = useStoredItems("coffee-platform-v1-comparison");
  const returnTo = useReturnTo(section === "coffee" ? "/coffee" : "/equipment");

  if (state.loading)
    return (
      <div className="directory-state" role="status">
        <span className="skeleton" />
        <p>جارٍ تحميل المنتج المنشور…</p>
      </div>
    );

  if (!product)
    return (
      <div className="directory-state">
        <Icon name="gear" />
        <h2>هذا المنتج غير منشور</h2>
        <p>
          {state.connected
            ? "لم نعثر على منتج منشور بهذا الرابط. قد يكون السجل قيد المراجعة أو مؤجلاً."
            : "تعذر الاتصال ببيانات المنتجات الآن، ولم نعرض بيانات بديلة على أنها منشورة."}
        </p>
        <Link className="primary" href={returnTo}>
          العودة إلى المنتجات
        </Link>
      </div>
    );

  const item = toCatalogItem(product);
  const saved = favorites.items.some((entry) => entry.id === item.id);
  const compared = comparison.items.some((entry) => entry.id === item.id);
  const blocked =
    !compared &&
    (comparison.items.length >= 4 ||
      (comparison.items.length > 0 && comparison.items[0].group !== item.group));
  const primaryCategory =
    product.product_categories.find((relation) => relation.is_primary)
      ?.categories || product.product_categories[0]?.categories;
  const attributes = product.product_attribute_values
    .filter((value) => value.field_definitions)
    .map((value) => [
      value.field_definitions?.name_ar || "مواصفة",
      attributeDisplayValue(value),
    ]);
  const roaster = product.roaster_specifications;
  const roasterRows = roaster
    ? [
        ["سعة الدفعة الدنيا", roaster.batch_min_kg ? `${roaster.batch_min_kg} كغم` : "غير متوفر"],
        ["سعة الدفعة القصوى", roaster.batch_max_kg ? `${roaster.batch_max_kg} كغم` : "غير متوفر"],
        ["الإنتاج في الساعة", roaster.production_kg_per_hour ? `${roaster.production_kg_per_hour} كغم/ساعة` : "غير متوفر"],
        ["مصدر الحرارة", roaster.heat_source || "غير متوفر"],
        ["مستوى التحكم", roaster.control_level || "غير متوفر"],
        ["التغذية الكهربائية", roaster.power_supply || "غير متوفر"],
        ["متطلبات الغاز", roaster.gas_type || "غير متوفر"],
        ["متطلبات العادم", roaster.exhaust_requirements || "غير متوفر"],
        ["الوزن", roaster.weight_kg ? `${roaster.weight_kg} كغم` : "غير متوفر"],
      ]
    : [];

  return (
    <div className="published-product">
      <div className="detail-return">
        <Link href={returnTo}>→ العودة إلى النتائج المحفوظة</Link>
        <span>الفلاتر والترتيب محفوظان في جلسة التصفح الحالية.</span>
      </div>
      <div className="crumb">
        <Link href="/">الرئيسية</Link>
        <span>‹</span>
        <Link href={product.product_kind === "roasted_coffee" ? "/coffee" : "/equipment"}>
          {product.product_kind === "roasted_coffee" ? "القهوة" : "المعدات"}
        </Link>
        <span>‹</span>
        <b>{product.name_ar}</b>
      </div>
      <div className="detail">
        <MediaCarousel items={product.media} emptyIcon={product.product_kind === "roasted_coffee" ? "coffee" : "gear"} emptyText="لا توجد صورة معتمدة لبطاقة المنتج الرئيسية" />
        <div className="detail-copy">
          <div className="badges">
            <span>سجل منشور</span>
            <span>{product.verification_tier.replace("t2_source_checked", "T2")}</span>
            {primaryCategory && <span>{primaryCategory.name_ar}</span>}
          </div>
          <h1>{product.name_ar}</h1>
          {product.name_en && <p lang="en">{product.name_en}</p>}
          <p>{product.description_ar || product.summary_ar || "لا يتوفر وصف معتمد حالياً."}</p>
          <div className="keyfacts">
            <span>العلامة: {product.brands?.name_ar || "غير متوفر"}</span>
            <span>الموديل: {product.model_number || "غير متوفر"}</span>
            <span>العروض المنشورة: {product.offers.length}</span>
            <span>
              آخر تحقق: {product.source_checked_at ? new Intl.DateTimeFormat("ar-IQ").format(new Date(product.source_checked_at)) : "غير متوفر"}
            </span>
          </div>
          <div className="detail-actions">
            <button
              className="secondary"
              aria-pressed={saved}
              onClick={() => favorites.setItems(toggleItem(favorites.items, item))}
            >
              {saved ? "محفوظ في المفضلة ✓" : "حفظ في المفضلة"}
            </button>
            <button
              className="secondary"
              disabled={blocked}
              aria-pressed={compared}
              onClick={() => comparison.setItems(toggleItem(comparison.items, item))}
            >
              {compared
                ? "مضاف للمقارنة ✓"
                : comparison.items.length >= 4
                  ? "اكتمل الحد الأقصى للمقارنة"
                  : blocked
                    ? "المقارنة لنفس النوع فقط"
                    : "إضافة للمقارنة"}
            </button>
          </div>
        </div>
        <section className="specs">
          <h2>المواصفات الموثقة</h2>
          {attributes.length || roasterRows.length ? (
            <table>
              <tbody>
                {[...attributes, ...roasterRows].map(([label, value]) => (
                  <tr key={String(label)}>
                    <th>{label}</th>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>لا توجد مواصفات منشورة لهذا المنتج حالياً.</p>
          )}
        </section>
        <section className="specs published-offers">
          <h2>العروض المنشورة</h2>
          {product.offers.length ? (
            <>
              <div className="referral-disclosure internal-commerce-disclosure">
                <b>البيع عبر صفحة البائع في قهوتنا</b>
                <p>كل عرض يقود إلى صفحة البائع الداخلية حيث تظهر منتجاته ومعلوماته المنشورة. الرابط الخارجي محفوظ كمصدر توثيق للإدارة ولا يُستخدم كوجهة البيع الأساسية.</p>
              </div>
              <div className="offers">
              {product.offers.map((offer) => (
                <article key={offer.id}>
                  <div>
                    <b>{offer.organizations?.name_ar || "بائع منشور"}</b>
                    <span>{offerAvailabilityLabel(offer.availability)}</span>
                  </div>
                  <strong>{formatPrice(offer.price, offer.currency_code)}</strong>
                  <small>
                    آخر رصد: {new Intl.DateTimeFormat("ar-IQ").format(new Date(offer.observed_at))}
                  </small>
                  {offer.organizations?.slug ? <Link href={`/directory/${offer.organizations.slug}/products/${product.slug}`}>فتح تفاصيل عرض البائع داخل قهوتنا</Link> : <span className="invalid-offer-link">صفحة البائع غير منشورة</span>}
                </article>
              ))}
              </div>
            </>
          ) : (
            <div className="directory-state compact">
              <h3>لا يوجد عرض منشور</h3>
              <p>وجود المنتج لا يعني توفره في بغداد. لن نعرض بائعاً بلا عرض موثق وحديث.</p>
            </div>
          )}
        </section>
        <div className="source-note specs">
          <b>سياسة البيانات</b>
          <p>تعرض هذه الصفحة السجلات المنشورة فقط. القيم الناقصة تبقى «غير متوفرة» ولا تُستنتج.</p>
        </div>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="directory-state not-found">
      <span className="eyebrow">404</span>
      <h1>الصفحة غير موجودة</h1>
      <p>قد يكون الرابط قديماً أو أن الصفحة لم تدخل بعد ضمن نطاق V1.</p>
      <div className="hero-actions">
        <Link className="primary" href="/">
          العودة للرئيسية
        </Link>
        <Link className="secondary" href="/search">
          البحث في المنصة
        </Link>
      </div>
    </div>
  );
}

function Origins({ page }: { page: PageDef }) {
  const state = usePublicOrigins();
  const ethiopia = state.countries.find((country) => country.code === "ET");
  const guji = ethiopia?.coffee_regions.find((region) => region.slug === "guji");
  const isGuji = page.path.endsWith("/guji");
  const isCountry = page.path === "/origins/ethiopia";

  if (state.loading)
    return (
      <div className="directory-state" role="status">
        جارٍ تحميل المصادر المنشورة…
      </div>
    );

  if (isGuji && guji) {
    const products = guji.origin_claims
      .map((claim) => claim.products)
      .filter((product): product is NonNullable<typeof product> => Boolean(product));
    return (
      <div className="origin-detail">
        <div className="badges"><span>مصدر منشور</span><span>إثيوبيا</span></div>
        <h2>{guji.name_ar}</h2>
        <p>الارتفاع الموثق: {guji.altitude_min_m || "غير متوفر"}–{guji.altitude_max_m || "غير متوفر"} م</p>
        <h3>القهوة المنشورة المرتبطة</h3>
        {products.length ? products.map((product) => (
          <Link className="origin-product-link" href={`/coffee/${product.slug}`} key={product.slug}>
            <b>{product.name_ar}</b><span>{product.summary_ar || "لا يتوفر ملخص"}</span>
          </Link>
        )) : <p>لا توجد قهوة منشورة مرتبطة بهذه المنطقة حالياً.</p>}
        <Link href="/knowledge">المحتوى المرتبط بالمصادر ←</Link>
      </div>
    );
  }

  if (isCountry && ethiopia) {
    return (
      <div className="origin-grid">
        {ethiopia.coffee_regions.map((region) => (
          <Link href={`/origins/ethiopia/${region.slug}`} key={region.id}>
            <div className="origin-art">{region.name_ar[0]}</div>
            <h3>{region.name_ar}</h3>
            <p>{region.origin_claims.length} منتج منشور مرتبط</p>
          </Link>
        ))}
      </div>
    );
  }

  if (!isCountry && !isGuji && state.countries.length) {
    return (
      <div className="origin-grid">
        {state.countries.map((country) => (
          <Link href={`/origins/${country.name_en.toLowerCase()}`} key={country.code}>
            <div className="origin-art">{country.name_ar[0]}</div>
            <h3>{country.name_ar}</h3>
            <p>{country.coffee_regions.length} منطقة منشورة</p>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="directory-state compact">
        <h2>لا توجد بيانات مصدر منشورة لهذه الصفحة</h2>
        <p>
          {state.connected
            ? "الدول والمناطق لا تظهر قبل اعتمادها وربطها بمنتج منشور ومصدر موثق."
            : "تعذر الاتصال ببيانات المصادر، ولم نعرض بيانات بديلة على أنها منشورة."}
        </p>
      </div>
      <div className="origin-review-card">
        <span className="eyebrow">معاينة داخلية · غير منشور</span>
        <h3>{isGuji ? "منطقة قوجي" : "إثيوبيا ← قوجي"}</h3>
        <p>هذا يوضح مسار الدولة ← المنطقة ← القهوة ← المحتوى، ولا يمثل سجلاً عاماً معتمداً.</p>
        {!isGuji && <Link href="/origins/ethiopia/guji">فتح نموذج العلاقة ←</Link>}
      </div>
    </>
  );
}
function Knowledge() {
  const state = usePublicContent();
  return (
    <>
      {state.loading ? (
        <div className="directory-state" role="status">
          جارٍ تحميل المحتوى المنشور…
        </div>
      ) : state.contents.length ? (
        <div className="topic-grid published-content-grid">
          {state.contents.map((content) => (
            <Link href={`/knowledge/${content.slug}`} key={content.id}>
              <span>محتوى منشور</span>
              <h3>{content.title_ar}</h3>
              <p>{content.excerpt_ar || "لا يتوفر ملخص معتمد."}</p>
              <small>
                {content.content_topics
                  .map((link) => link.topics?.name_ar)
                  .filter(Boolean)
                  .join(" · ") || "دون موضوع مصنف"}
              </small>
            </Link>
          ))}
        </div>
      ) : (
        <div className="directory-state compact">
          <h2>لا يوجد محتوى منشور بعد</h2>
          <p>
            {state.connected
              ? "المقالات الحالية ما زالت في مرحلة الإعداد والمراجعة."
              : "تعذر الاتصال بالمحتوى المنشور، ولم نعرض المسودات على أنها منشورة."}
          </p>
        </div>
      )}
      <div className="section-head review-content-head">
        <div>
          <span className="eyebrow">معاينة داخلية</span>
          <h2>هيكل موضوعات V1</h2>
        </div>
        <span>غير منشور</span>
      </div>
      <div className="topic-grid">
        {[
          "أساسيات التحضير",
          "دليل الطحن",
          "أساسيات التحميص",
          "الماء والقهوة",
          "تنظيف المعدات",
          "طريقة V60",
        ].map((x, i) => (
          <Link
            href={
              [
                "/knowledge/brewing",
                "/knowledge/grinding",
                "/knowledge/roasting",
                "/knowledge/water",
                "/knowledge/cleaning",
                "/knowledge/v60-guide",
              ][i]
            }
            key={x}
          >
            <span>0{i + 1}</span>
            <h3>{x}</h3>
            <p>محتوى عملي مرتبط بالمنتجات والمعدات ذات العلاقة.</p>
          </Link>
        ))}
      </div>
    </>
  );
}
function Article({ page }: { page: PageDef }) {
  return (
    <article className="article">
      <div className="review-content-banner">
        معاينة تحريرية غير منشورة — يجب اعتماد النص والمصادر قبل ظهوره للعامة
      </div>
      <div className="article-meta">
        8 دقائق قراءة · مراجعة تحريرية · 7 أغسطس 2026
      </div>
      <h2>{page.title}</h2>
      <p className="lead">{page.desc}</p>
      <div className="article-hero" />
      <h3>الفكرة الأساسية</h3>
      <p>
        ابدأ بمتغير واحد واضح، وسجّل النتيجة، ثم عدّل تدريجياً. تختلف النتيجة
        باختلاف القهوة والمعدات والماء، لذلك نعرض نقطة بداية لا قاعدة مطلقة.
      </p>
      <div className="callout">
        <b>قاعدة المنصة</b>
        <p>
          أي رقم تطبيقي يعرض كوصفة بداية، وأي تعليمات أمان أو صيانة ترجع إلى
          الشركة المصنعة.
        </p>
      </div>
      <h3>خطوات قابلة للتطبيق</h3>
      <ol>
        <li>حدد الهدف والطريقة والمعدات المتاحة.</li>
        <li>استخدم قياساً ثابتاً للجرعة والماء والوقت.</li>
        <li>دوّن التغيير والنتيجة بدلاً من تغيير عدة متغيرات معاً.</li>
      </ol>
      <aside>
        <b>منتجات ومحتوى مرتبط</b>
        <Link href="/coffee">القهوة المناسبة</Link>
        <Link href="/equipment">المعدات</Link>
        <Link href="/compare">المقارنة</Link>
      </aside>
    </article>
  );
}
function SearchPage() {
  const status = usePlatformStatus();
  const publishedDirectory = usePublicDirectory();
  const publishedCatalog = usePublicProducts();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<SearchRequestType>("smart");
  const lastLoggedRef = useRef("");
  const [state, setState] = useState<{
    loading: boolean;
    connected: boolean;
    intent: SearchIntent;
    explanation: string;
    searchedTypes: SearchEntityType[];
    requestedType: SearchRequestType;
    resultCounts: Record<SearchEntityType, number>;
    results: Array<{
      id: string;
      type: SearchEntityType;
      title: string;
      subtitle: string;
      href: string;
    }>;
  }>({
    loading: false,
    connected: true,
    intent: "unknown",
    explanation: "",
    searchedTypes: allSearchTypes,
    requestedType: "smart",
    resultCounts: { product: 0, origin: 0, content: 0, organization: 0 },
    results: [],
  });
  const normalizedQuery = normalizeSearchText(q);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      const handle = window.setTimeout(
        () => setState((current) => ({
          ...current,
          loading: false,
          connected: true,
          intent: "unknown",
          explanation: "",
          results: [],
        })),
        0,
      );
      return () => window.clearTimeout(handle);
    }
    const handle = window.setTimeout(() => {
      setState((current) => ({ ...current, loading: true }));
      fetch(`/api/public-search?q=${encodeURIComponent(term)}&type=${filter}`)
        .then(async (response) => await response.json())
        .then((data) => {
          setState({
            loading: false,
            connected: Boolean(data.connected),
            intent: data.intent || "unknown",
            explanation: data.explanation || "",
            searchedTypes: Array.isArray(data.searchedTypes) ? data.searchedTypes : allSearchTypes,
            requestedType: data.requestedType || filter,
            resultCounts: data.resultCounts || { product: 0, origin: 0, content: 0, organization: 0 },
            results: Array.isArray(data.results) ? data.results : [],
          });
          const fingerprint = `${normalizeSearchText(term)}:${filter}`;
          if (data.connected && term.trim().length >= 3 && lastLoggedRef.current !== fingerprint) {
            lastLoggedRef.current = fingerprint;
            void fetch("/api/search-event", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                query: term,
                intent: data.intent || "unknown",
                requestedType: filter,
                resultCount: Array.isArray(data.results) ? data.results.length : 0,
                resultCounts: data.resultCounts || {},
                reviewMode: status?.publicLaunch !== true,
              }),
            }).catch(() => undefined);
          }
        })
        .catch(() =>
          setState((current) => ({ ...current, loading: false, connected: false, results: [] })),
        );
    }, 450);
    return () => window.clearTimeout(handle);
  }, [q, filter, status?.publicLaunch]);
  const results = state.results;
  const publishedOrganizationSlugs = new Set(
    publishedDirectory.organizations.map((organization) => organization.slug),
  );
  const publishedProductSlugs = new Set(
    publishedCatalog.products.map((product) => product.slug),
  );
  const reviewTypes: SearchEntityType[] = filter === "smart"
    ? state.searchedTypes
    : filter === "all" ? allSearchTypes : [filter];
  const reviewResults =
    normalizedQuery.length >= 2 &&
    !publishedDirectory.loading &&
    !publishedCatalog.loading &&
    status?.publicLaunch !== true
      ? [
          ...reviewOrganizations
            .filter(
              (organization) =>
                !publishedOrganizationSlugs.has(organization.slug),
            )
            .map((organization) => ({
            id: organization.id,
            type: "organization" as const,
            title: organization.nameAr,
            subtitle: `${organization.nameEn} · ${organization.districts.join(" · ") || "موقع بغداد غير مثبت"}`,
            href: `/directory/review/${organization.slug}`,
          })),
          ...equipment
            .filter(
              (item) =>
                !item.recordSlug || !publishedProductSlugs.has(item.recordSlug),
            )
            .map((item) => ({
              id: item.id,
              type: "product" as const,
              title: item.name,
              subtitle: item.meta,
              href: item.href,
            })),
          ...[
            { id: "preview-origin-ethiopia-guji", type: "origin" as const, title: "إثيوبيا — قوجي", subtitle: "مصدر قهوة نموذجي يربط الدولة والمنطقة والمنتجات", href: "/origins/ethiopia/guji" },
          ],
          ...[
            ["preview-knowledge-brewing", "أساسيات التحضير", "معرفة عملية مرتبطة بالقهوة", "/knowledge/brewing"],
            ["preview-knowledge-grinding", "دليل الطحن", "معرفة مرتبطة بطحن القهوة والمعدات", "/knowledge/grinding"],
            ["preview-knowledge-roasting", "أساسيات التحميص", "معرفة مرتبطة بتحميص القهوة", "/knowledge/roasting"],
            ["preview-knowledge-water", "الماء والقهوة", "معرفة عن الماء وجودة القهوة", "/knowledge/water"],
            ["preview-knowledge-v60", "طريقة V60", "دليل تحضير القهوة بالتقطير", "/knowledge/v60-guide"],
          ].map(([id, title, subtitle, href]) => ({ id, type: "content" as const, title, subtitle, href })),
        ].filter((result) => {
          const matchesType = reviewTypes.includes(result.type);
          const searchable = [result.title, result.subtitle]
            .join(" ")
            .toLocaleLowerCase("ar");
          return matchesType && normalizeSearchText(searchable).includes(normalizedQuery);
        })
      : [];
  const typeLabel = {
    product: "منتج",
    organization: "جهة",
    content: "معرفة",
    origin: "مصدر قهوة",
  };
  const typeIcon = {
    product: "gear",
    organization: "place",
    content: "learn",
    origin: "origin",
  };
  const groupOrder: Array<"product" | "origin" | "content" | "organization"> = ["product", "origin", "content", "organization"];
  const groupedResults = groupOrder.map((type) => ({ type, items: results.filter((item) => item.type === type) })).filter((group) => group.items.length);
  const groupedReviewResults = groupOrder.map((type) => ({ type, items: reviewResults.filter((item) => item.type === type) })).filter((group) => group.items.length);
  return (
    <div className="search-page">
      <div className="big-search">
        <Icon name="search" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن قهوة، ماكينة، محمصة، مصدر أو دليل…"
          aria-label="عبارة البحث"
          autoFocus
        />
        <button type="button">بحث</button>
      </div>
      <div className="search-types">
        <button
          aria-pressed={filter === "smart"}
          onClick={() => setFilter("smart")}
        >
          الأدق تلقائياً
        </button>
        <button
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          الكل
        </button>
        <button
          aria-pressed={filter === "product"}
          onClick={() => setFilter("product")}
        >
          المنتجات
        </button>
        <button
          aria-pressed={filter === "organization"}
          onClick={() => setFilter("organization")}
        >
          الجهات
        </button>
        <button
          aria-pressed={filter === "origin"}
          onClick={() => setFilter("origin")}
        >
          المصادر
        </button>
        <button
          aria-pressed={filter === "content"}
          onClick={() => setFilter("content")}
        >
          المعرفة
        </button>
      </div>
      {filter === "smart" && state.explanation && q.trim().length >= 2 && (
        <p className="search-intent" role="status">
          {state.explanation}
          {state.intent !== "unknown" && state.intent !== "broad" && (
            <> يمكنك اختيار «الكل» لتوسيع نطاق النتائج.</>
          )}
        </p>
      )}
      <p>
        {q.trim().length < 2
          ? "اكتب حرفين على الأقل للبحث في السجلات المنشورة."
          : state.loading
            ? "جارٍ البحث…"
            : `${results.length} نتيجة منشورة`}
      </p>
      {groupedResults.map((group) => (
        <section className="search-result-group" key={group.type}>
          <h2>{typeLabel[group.type]} <span>{group.items.length}</span></h2>
          <div className="search-results">
            {group.items.map((x) => (
              <Link href={x.href} key={x.id}>
                <div className="avatar"><Icon name={typeIcon[x.type]} /></div>
                <div><small>{typeLabel[x.type]}</small><h3>{x.title}</h3><p>{x.subtitle}</p></div><b>←</b>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {q.trim().length >= 2 &&
        !state.loading &&
        !results.length &&
        !reviewResults.length && (
        <div className="directory-state">
          <Icon name="search" />
          <h3>لا توجد نتائج منشورة</h3>
          <p>
            {state.connected
              ? "جرّب اسماً آخر أو غيّر نوع النتائج. السجلات قيد المراجعة لا تظهر هنا."
              : "تعذر الاتصال بالبحث الآن، ولم نعرض نتائج تجريبية بديلة."}
          </p>
        </div>
      )}
      {reviewResults.length > 0 && (
        <section className="search-review-preview">
          <div className="section-head">
            <div>
              <span className="eyebrow">معاينة داخلية</span>
              <h2>نتائج قيد المراجعة</h2>
            </div>
            <span>ليست نتائج منشورة</span>
          </div>
          {groupedReviewResults.map((group) => (
            <div className="search-review-group" key={group.type}>
              <h3>{typeLabel[group.type]} <span>{group.items.length}</span></h3>
              <div className="search-results">
                {group.items.map((result) => (
                  <Link href={result.href} key={result.id}>
                    <div className="avatar"><Icon name={typeIcon[result.type]} /></div>
                    <div><small>{typeLabel[result.type]} · قيد المراجعة</small><h3>{result.title}</h3><p>{result.subtitle}</p></div><b>←</b>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
type ComparisonField =
  | "price"
  | "brand"
  | "availability"
  | "drive"
  | "burr"
  | "roasterClass"
  | "heat"
  | "description"
  | "status";

function comparisonValue(item: CatalogItem, field: ComparisonField) {
  const labels: Record<string, string> = {
    manual: "يدوية",
    electric: "كهربائية",
    flat: "مسطحة",
    conical: "مخروطية",
    home: "منزلية",
    sample: "عينات",
    commercial_batch: "تجارية",
    natural_gas: "غاز طبيعي",
    lpg: "غاز مسال LPG",
    dual_fuel: "غاز طبيعي أو LPG",
  };
  if (field === "price") return item.price;
  if (field === "brand") return item.brand || "غير متوفر";
  if (field === "availability")
    return item.availableInBaghdad ? "متوفر في بغداد" : "غير مؤكد";
  if (field === "drive") return labels[item.drive || ""] || "غير متوفر";
  if (field === "burr")
    return labels[item.burrGeometry || ""] || "غير متوفر";
  if (field === "roasterClass")
    return labels[item.roasterClass || ""] || "غير متوفر";
  if (field === "heat")
    return labels[item.heatSource || ""] || "غير متوفر";
  if (field === "description") return item.meta;
  return item.reviewLabel || "نموذج بيانات V1";
}

function comparisonRows(items: CatalogItem[]) {
  const rows: Array<[ComparisonField, string]> = [
    ["price", "السعر"],
    ["brand", "العلامة"],
    ["availability", "التوفر في بغداد"],
  ];
  if (items.some((item) => item.drive || item.burrGeometry)) {
    rows.push(["drive", "نمط التشغيل"], ["burr", "شكل الشفرات"]);
  }
  if (items.some((item) => item.roasterClass || item.heatSource)) {
    rows.push(["roasterClass", "فئة الاستخدام"], ["heat", "مصدر الحرارة"]);
  }
  rows.push(["description", "الوصف"], ["status", "حالة البيانات"]);
  return rows;
}

function Compare() {
  const comparison = useStoredItems("coffee-platform-v1-comparison");
  if (!comparison.ready)
    return (
      <div className="directory-state">
        <p>جارٍ تحميل المقارنة…</p>
        <small>
          يمكنك مقارنة من منتجين إلى أربعة منتجات من مجموعة المقارنة نفسها.
        </small>
      </div>
    );
  if (!comparison.items.length)
    return (
      <div className="empty">
        <Icon name="compare" />
        <h3>لم تضف منتجات للمقارنة بعد</h3>
        <p>
          أضف من منتجين إلى أربعة منتجات من مجموعة المقارنة نفسها حتى تكون
          المواصفات قابلة للمقارنة.
        </p>
        <Link className="primary" href="/coffee">
          استكشف المنتجات
        </Link>
      </div>
    );
  const items = comparison.items.slice(0, 4);
  const addMoreHref =
    items[0].type === "coffee"
      ? "/coffee"
      : items[0].roasterClass
        ? "/equipment/roasting-machines"
        : "/equipment/grinders";
  return (
    <div className="compare">
      <div className="compare-head">
        <h2>مقارنة {items[0].type === "coffee" ? "القهوة" : "المعدات"}</h2>
        <p>
          {items.length === 1
            ? "أضف منتجاً آخر من النوع نفسه لإكمال المقارنة."
            : `تتم مقارنة ${items.length} منتجات من المجموعة نفسها، والحد الأقصى 4.`}
        </p>
      </div>
      <table>
        <thead>
          <tr>
            <th>المواصفة</th>
            {items.map((item) => (
              <th key={item.id}>
                <Link href={withReturnTo(item.href, "/compare")}>{item.name}</Link>{" "}
                <button
                  aria-label={`إزالة ${item.name}`}
                  onClick={() =>
                    comparison.setItems(
                      comparison.items.filter((x) => x.id !== item.id),
                    )
                  }
                >
                  ×
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparisonRows(items).map(([field, label]) => {
            const values = items.map((item) => comparisonValue(item, field));
            const differs = new Set(values).size > 1;
            return (
            <tr key={field} className={differs ? "compare-difference" : ""}>
              <th>{label}</th>
              {items.map((item, index) => (
                <td key={item.id}>
                  {values[index]}
                </td>
              ))}
            </tr>
            );
          })}
        </tbody>
      </table>
      <div className="compare-actions">
        <Link className="primary" href={addMoreHref}>
          إضافة منتج من النوع نفسه
        </Link>
        <button className="secondary" onClick={() => comparison.setItems([])}>
          مسح المقارنة
        </button>
      </div>
    </div>
  );
}
function Favorites() {
  const favorites = useStoredItems("coffee-platform-v1-favorites");
  const [filter, setFilter] = useState<"all" | "coffee" | "equipment">("all");
  const shown =
    filter === "all"
      ? favorites.items
      : favorites.items.filter((item) => item.type === filter);
  if (!favorites.ready)
    return <div className="directory-state">جارٍ تحميل العناصر المحفوظة…</div>;
  return (
    <>
      <div className="tabs">
        <button
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          الكل {favorites.items.length}
        </button>
        <button
          aria-pressed={filter === "coffee"}
          onClick={() => setFilter("coffee")}
        >
          القهوة {favorites.items.filter((x) => x.type === "coffee").length}
        </button>
        <button
          aria-pressed={filter === "equipment"}
          onClick={() => setFilter("equipment")}
        >
          المعدات {favorites.items.filter((x) => x.type === "equipment").length}
        </button>
      </div>
      {shown.length ? (
        <section className="section saved-section">
          <div className="saved-note">
            <b>محفوظة على هذا الجهاز</b>
            <span>فتح المنتج والعودة لا يزيل اختيار القسم الحالي.</span>
          </div>
          <Cards items={shown} returnTo="/favorites" />
        </section>
      ) : (
        <div className="empty">
          <Icon name="heart" />
          <h3>لا توجد عناصر محفوظة في هذا القسم</h3>
          <p>احفظ العناصر التي تهمك لتعود إليها من هذا الجهاز.</p>
          <Link className="primary" href="/coffee">
            استكشف القهوة
          </Link>
        </div>
      )}
    </>
  );
}
function FormPage({ page }: { page: PageDef }) {
  const [submission, setSubmission] = useState<{
    kind: "sent" | "draft" | "error";
    reference?: string;
    message: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  function saveLocalDraft(payload: Record<string, unknown>) {
    const nextReference = `DRAFT-${Date.now().toString(36).toUpperCase()}`;
    let drafts: Array<Record<string, unknown>> = [];
    try {
      drafts = JSON.parse(
        localStorage.getItem("coffee-platform-v1-rights-drafts") || "[]",
      );
    } catch {
      drafts = [];
    }
    drafts.push({
      ...payload,
      reference: nextReference,
      status: "local_draft",
    });
    localStorage.setItem(
      "coffee-platform-v1-rights-drafts",
      JSON.stringify(drafts),
    );
    return nextReference;
  }
  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSubmission(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      page: page.path,
      target: form.get("target"),
      name: form.get("name"),
      email: form.get("email"),
      phone: form.get("phone"),
      requestType: form.get("requestType"),
      details: form.get("details"),
      evidenceReference: form.get("evidenceReference"),
      consent: form.get("consent") === "on",
      website: form.get("website"),
      createdAt: new Date().toISOString(),
    };
    try {
      const response = await fetch("/api/rights-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (response.ok && result.accepted && result.reference) {
        setSubmission({
          kind: "sent",
          reference: result.reference,
          message: "تم تسجيل الطلب في قاعدة البيانات للمراجعة.",
        });
        formElement.reset();
      } else if (response.status >= 500) {
        const reference = saveLocalDraft(payload);
        setSubmission({
          kind: "draft",
          reference,
          message:
            "تعذر الإرسال الآن، لذلك حُفظت نسخة محلية ولم نفقد معلوماتك.",
        });
      } else {
        setSubmission({
          kind: "error",
          message:
            response.status === 429
              ? "تم تجاوز عدد المحاولات. انتظر عشر دقائق ثم حاول مجدداً."
              : "تحقق من الحقول والتفاصيل ثم حاول مجدداً.",
        });
      }
    } catch {
      const reference = saveLocalDraft(payload);
      setSubmission({
        kind: "draft",
        reference,
        message: "الاتصال غير متاح؛ حُفظت نسخة محلية على هذا الجهاز.",
      });
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="form-layout">
      <form onSubmit={submitRequest}>
        <div className="step-badge">1 من 3</div>
        <h2>{page.title}</h2>
        <p>{page.desc}</p>
        {submission && (
          <div className={`draft-success ${submission.kind}`} role="status">
            <b>
              {submission.kind === "sent"
                ? "تم استلام الطلب"
                : submission.kind === "draft"
                  ? "حُفظت مسودة احتياطية"
                  : "لم يتم الإرسال"}
            </b>
            {submission.reference && (
              <span>الرقم المرجعي: {submission.reference}</span>
            )}
            <p>{submission.message}</p>
          </div>
        )}
        <label className="honeypot" aria-hidden="true">
          الموقع الشخصي
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <label>
          رابط الصفحة أو اسم الجهة
          <input name="target" placeholder="مثال: محمصة سومر" required />
        </label>
        <label>
          الاسم الكامل
          <input name="name" required />
        </label>
        <label>
          البريد الإلكتروني
          <input name="email" type="email" required />
        </label>
        <label>
          رقم الهاتف (اختياري)
          <input name="phone" inputMode="tel" />
        </label>
        <label>
          نوع الطلب
          <select name="requestType">
            <option value="correction">تصحيح معلومة</option>
            <option value="removal">إزالة بيانات</option>
            <option value="objection">اعتراض على معلومة</option>
            <option value="privacy">طلب خصوصية</option>
            <option value="listing_claim">المطالبة بالصفحة</option>
          </select>
        </label>
        <label>
          التفاصيل
          <textarea name="details" rows={5} minLength={20} required />
        </label>
        <label className="upload">
          رابط دليل عام (اختياري)
          <span>موقع رسمي أو صفحة عامة؛ رفع الملفات الخاصة مؤجل</span>
          <input name="evidenceReference" type="url" />
        </label>
        <label className="check">
          <input name="consent" type="checkbox" required /> أؤكد صحة المعلومات
          وأوافق على التواصل معي بشأن الطلب
        </label>
        <button className="primary" type="submit" disabled={submitting}>
          {submitting ? "جارٍ التسجيل…" : "إرسال للمراجعة"}
        </button>
      </form>
      <aside>
        <b>ماذا يحدث بعد الإرسال؟</b>
        <ol>
          <li>تسجيل الطلب وإعطاؤه رقماً مرجعياً.</li>
          <li>مراجعة الهوية والأدلة.</li>
          <li>إبلاغك بالنتيجة أو طلب معلومات إضافية.</li>
        </ol>
        <p>لا يؤدي الطلب إلى تعديل أو نشر تلقائي، ويخضع لمراجعة بشرية.</p>
      </aside>
    </div>
  );
}
const betaTestTasks = [
  {
    id: "directory",
    number: "01",
    title: "اكتشف جهة في بغداد",
    description:
      "صفِّ الدليل حسب المنطقة، ثم افتح بُن رضا علوان وتأكد من ظهور الفروع المنشورة.",
    href: "/directory",
    action: "فتح دليل بغداد",
  },
  {
    id: "search",
    number: "02",
    title: "اختبر البحث العام",
    description:
      "ابحث عن «قهوة» ثم جرّب اسماً أدق، ولاحظ هل تستطيع تمييز المنتجات والجهات والمصادر والمعرفة.",
    href: "/search",
    action: "فتح البحث",
  },
  {
    id: "finder",
    number: "03",
    title: "استخدم مساعد اختيار القهوة",
    description:
      "أجب عن الأسئلة الأربعة وتحقق من وضوح سبب ترتيب النتائج وإمكانية إعادة الاختيار.",
    href: "/coffee/finder",
    action: "بدء Coffee Finder",
  },
  {
    id: "equipment",
    number: "04",
    title: "جرّب فلاتر المعدات",
    description:
      "افتح المطاحن وغيّر الفلاتر الخاصة بالفئة، ثم تأكد من وضوح حالة عدم وجود نتائج.",
    href: "/equipment/grinders",
    action: "فتح المطاحن",
  },
  {
    id: "support",
    number: "05",
    title: "اختبر طلب المساعدة",
    description:
      "سجّل طلباً تجريبياً واحصل على الرقم المرجعي، ثم تحقق من فتح رسالة واتساب الجاهزة.",
    href: "/help",
    action: "فتح المساعدة",
  },
  {
    id: "feedback",
    number: "06",
    title: "سجّل نتيجة الاختبار",
    description:
      "أرسل نتيجة مهمة واحدة: نجحت، نجحت جزئياً، أو فشلت، مع وصف واضح لما حدث.",
    href: "/beta/feedback",
    action: "تسجيل النتيجة",
  },
] as const;

function BetaHub() {
  const [completed, setCompleted] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem("coffee-platform-v1-beta-progress");
        const parsed = stored ? JSON.parse(stored) : [];
        setCompleted(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
      } catch {
        setCompleted([]);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);

  function toggleTask(taskId: string) {
    setCompleted((current) => {
      const next = current.includes(taskId)
        ? current.filter((item) => item !== taskId)
        : [...current, taskId];
      localStorage.setItem(
        "coffee-platform-v1-beta-progress",
        JSON.stringify(next),
      );
      return next;
    });
  }

  const completedCount = betaTestTasks.filter((task) =>
    completed.includes(task.id),
  ).length;
  const progress = Math.round((completedCount / betaTestTasks.length) * 100);

  return (
    <div className="beta-hub">
      <section className="beta-intro">
        <div>
          <span className="eyebrow">نسخة V1 الخاصة · بغداد</span>
          <h2>اختبار واقعي من ست مهمات</h2>
          <p>
            نفّذ المهمات بالترتيب أو اختر ما يناسبك. علّم المهمة بعد تجربتها،
            ثم سجّل نتيجة مستقلة إذا واجهت مشكلة أو لاحظت فرصة تحسين.
          </p>
        </div>
        <div className="beta-progress" aria-live="polite">
          <strong>{ready ? `${progress}%` : "—"}</strong>
          <span>{completedCount} من {betaTestTasks.length} مكتملة</span>
          <div aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>
        </div>
      </section>

      <div className="beta-safety" role="note">
        <b>قبل أن تبدأ</b>
        <span>لا تستخدم كلمة مرور أو بيانات مالية أو معلومات شخصية حقيقية أثناء الاختبار.</span>
      </div>

      <section className="beta-task-list" aria-label="مهمات الاختبار المغلق">
        {betaTestTasks.map((task) => {
          const done = completed.includes(task.id);
          return (
            <article className={done ? "done" : ""} key={task.id}>
              <span className="beta-task-number">{task.number}</span>
              <div>
                <h3>{task.title}</h3>
                <p>{task.description}</p>
                <Link href={task.href}>{task.action} ←</Link>
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={done}
                  onChange={() => toggleTask(task.id)}
                />
                <span>{done ? "تمت التجربة" : "علّم بعد التجربة"}</span>
              </label>
            </article>
          );
        })}
      </section>

      <section className="beta-finish">
        <div>
          <span className="eyebrow">النتيجة هي الدليل</span>
          <h2>{completedCount === betaTestTasks.length ? "اكتملت الجولة" : "سجّل ما حدث فعلياً"}</h2>
          <p>كل نتيجة محفوظة تحصل على رقم مرجعي وتظهر في لوحة التشغيل للمراجعة.</p>
        </div>
        <Link className="primary" href="/beta/feedback">تسجيل نتيجة اختبار</Link>
      </section>
    </div>
  );
}

function BetaFeedback() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await fetch("/api/beta-feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pagePath: form.get("pagePath"), taskCode: form.get("taskCode"), outcome: form.get("outcome"),
        deviceType: form.get("deviceType"), durationSeconds: form.get("durationSeconds"), severity: form.get("severity"),
        feedbackText: form.get("feedbackText"), consent: form.get("consent") === "on", website: form.get("website"),
      }),
    });
    const result = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (response.ok && result.reference) {
      setMessage(`تم تسجيل النتيجة. الرقم المرجعي: ${result.reference}`);
      formElement.reset();
    } else setMessage(response.status === 429 ? "محاولات كثيرة؛ انتظر عشر دقائق." : "تعذر التسجيل. تحقق من الحقول وحاول مجدداً.");
  }
  return (
    <div className="form-layout beta-feedback-form">
      <form onSubmit={submit}>
        <span className="eyebrow">اختبار واقعي منظم</span>
        <h2>نتيجة مهمة واحدة</h2>
        <p>لا ترسل كلمة مرور أو بيانات شخصية. صف ما حاولت فعله وأين توقفت.</p>
        {message && <div className="draft-success sent" role="status"><b>{message}</b></div>}
        <label className="honeypot" aria-hidden="true">الموقع الشخصي<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <label>مسار الصفحة<input name="pagePath" defaultValue="/" placeholder="/coffee أو /compare" required /></label>
        <label>المهمة<select name="taskCode" defaultValue="discover"><option value="discover">اكتشاف منتج</option><option value="filter">التصفية</option><option value="compare">المقارنة</option><option value="finder">Coffee Finder</option><option value="offer">فتح عرض</option><option value="directory">دليل بغداد</option><option value="search">البحث</option><option value="admin">لوحة الإدارة</option><option value="other">أخرى</option></select></label>
        <label>النتيجة<select name="outcome"><option value="success">نجحت</option><option value="partial">نجحت جزئياً</option><option value="failed">فشلت</option></select></label>
        <label>الجهاز<select name="deviceType"><option value="android">Android</option><option value="iphone">iPhone</option><option value="desktop">حاسوب</option><option value="tablet">جهاز لوحي</option><option value="other">آخر</option></select></label>
        <label>الوقت بالثواني (اختياري)<input name="durationSeconds" type="number" min="0" max="14400" inputMode="numeric" /></label>
        <label>شدة المشكلة<select name="severity"><option value="none">لا توجد مشكلة</option><option value="p3">P3 تحسين</option><option value="p2">P2 مهمة</option><option value="p1">P1 حرجة قبل الاختبار</option><option value="p0">P0 تمنع المهمة</option></select></label>
        <label>ماذا حدث؟<textarea name="feedbackText" rows={6} minLength={10} maxLength={4000} required /></label>
        <label className="check"><input name="consent" type="checkbox" required /> أوافق على استخدام هذه الملاحظة لتحسين النسخة التجريبية.</label>
        <button className="primary" type="submit" disabled={submitting}>{submitting ? "جارٍ التسجيل…" : "تسجيل النتيجة"}</button>
      </form>
      <aside><b>طريقة الاختبار</b><ol><li>نفّذ مهمة واحدة فقط.</li><li>سجّل النجاح والزمن والجهاز.</li><li>صف نقطة التعطل بوضوح.</li></ol><p>ستحصل على رقم مرجعي لكل نتيجة محفوظة.</p></aside>
    </div>
  );
}

const supportTypeLabels: Record<string, string> = {
  platform_issue: "مشكلة في استخدام المنصة",
  incorrect_information: "معلومة أو سعر غير صحيح",
  missing_listing: "منتج أو جهة غير موجودة",
  search_issue: "مشكلة في البحث أو النتائج",
  suggestion: "اقتراح أو ملاحظة عامة",
  business: "شراكة أو تواصل تجاري",
  other: "موضوع آخر",
};
const supportWhatsAppNumber = "905417730348";

function HelpSupport() {
  const sourcePageRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{
    reference: string;
    requestType: string;
    pagePath: string;
    subject: string;
  } | null>(null);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("coffee-support-from");
    if (stored?.startsWith("/") && sourcePageRef.current)
      sourcePageRef.current.value = stored.slice(0, 500);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setReceipt(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const requestType = String(form.get("requestType") || "");
    const pagePath = String(form.get("pagePath") || "/");
    const subject = String(form.get("subject") || "");
    const response = await fetch("/api/support-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        requestType,
        pagePath,
        subject,
        message: form.get("message"),
        requesterName: form.get("requesterName"),
        requesterPhone: form.get("requesterPhone"),
        requesterEmail: form.get("requesterEmail"),
        preferredChannel: form.get("preferredChannel"),
        consent: form.get("consent") === "on",
        website: form.get("website"),
      }),
    });
    const result = await response.json().catch(() => ({}));
    setSubmitting(false);
    if (response.ok && result.reference) {
      setReceipt({ reference: result.reference, requestType, pagePath, subject });
      window.sessionStorage.removeItem("coffee-support-from");
      formElement.reset();
    } else {
      setError(response.status === 429 ? "تم إرسال عدة طلبات؛ انتظر عشر دقائق ثم حاول مجدداً." : "تعذر تسجيل الطلب. تحقق من الحقول وحاول مرة أخرى.");
    }
  }

  const whatsappText = receipt
    ? [
        "مرحباً، أحتاج مساعدة في منصة قَهوتنا.",
        `الرقم المرجعي: ${receipt.reference}`,
        `نوع الطلب: ${supportTypeLabels[receipt.requestType] || "مساعدة"}`,
        `الموضوع: ${receipt.subject}`,
        `الصفحة: ${receipt.pagePath}`,
      ].join("\n")
    : "مرحباً، أحتاج مساعدة في منصة قَهوتنا.";
  const whatsappHref = `https://wa.me/${supportWhatsAppNumber}?text=${encodeURIComponent(whatsappText)}`;

  return (
    <div className="form-layout support-form">
      <form onSubmit={submit}>
        <span className="eyebrow">مساعدة موثقة وسريعة</span>
        <h2>كيف نستطيع مساعدتك؟</h2>
        <p>سجّل الموضوع أولاً ليظهر في لوحة المتابعة، ثم أكمل الحديث عبر واتساب إذا رغبت. لا ترسل كلمة مرور أو بيانات مالية.</p>
        {receipt && (
          <div className="support-receipt" role="status">
            <b>تم تسجيل طلبك: {receipt.reference}</b>
            <span>الخطوة التالية: افتح واتساب واضغط إرسال لتصل الرسالة إلى خدمة المستخدم.</span>
            <a className="whatsapp-button" href={whatsappHref} target="_blank" rel="noreferrer">متابعة الطلب عبر واتساب</a>
          </div>
        )}
        {error && <div className="draft-success error" role="alert"><b>{error}</b></div>}
        <label className="honeypot" aria-hidden="true">الموقع الشخصي<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <label>
          نوع الطلب
          <select name="requestType" defaultValue="platform_issue" required>
            {Object.entries(supportTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
          </select>
        </label>
        <label>
          الصفحة المرتبطة بالموضوع
          <input ref={sourcePageRef} name="pagePath" defaultValue="/" placeholder="/search أو /coffee" maxLength={500} required />
        </label>
        <label>عنوان مختصر<input name="subject" minLength={4} maxLength={160} placeholder="مثال: نتائج البحث لا تظهر" required /></label>
        <label>الاسم<input name="requesterName" minLength={2} maxLength={160} required /></label>
        <label>رقم واتساب مع رمز الدولة<input name="requesterPhone" type="tel" inputMode="tel" maxLength={40} placeholder="مثال: +9647…" required /><small>نستخدمه فقط لإرسال نتيجة هذا الطلب إذا اخترت واتساب.</small></label>
        <label>البريد الإلكتروني (اختياري)<input name="requesterEmail" type="email" maxLength={200} /></label>
        <label>اشرح المشكلة أو الاقتراح<textarea name="message" rows={6} minLength={10} maxLength={4000} required /></label>
        <label>
          طريقة المتابعة المفضلة
          <select name="preferredChannel" defaultValue="whatsapp"><option value="whatsapp">واتساب</option><option value="platform">داخل المنصة فقط</option></select>
        </label>
        <label className="check"><input name="consent" type="checkbox" required /> أوافق على استخدام هذه المعلومات لمعالجة الطلب وتحسين المنصة.</label>
        <button className="primary" type="submit" disabled={submitting}>{submitting ? "جارٍ تسجيل الطلب…" : "تسجيل الطلب والحصول على رقم مرجعي"}</button>
      </form>
      <aside>
        <b>تواصل سريع عبر واتساب</b>
        <p>بعد تسجيل الطلب ستفتح رسالة تحمل الرقم المرجعي تلقائياً. واتساب لا يرسلها دون موافقتك.</p>
        <a className="whatsapp-link" href={whatsappHref} target="_blank" rel="noreferrer">فتح واتساب مباشرة</a>
        <hr />
        <b>طلبات الحقوق منفصلة</b>
        <p>لتصحيح بيانات جهة أو طلب الإزالة استخدم مسارات الحقوق المخصصة حتى تبقى المراجعة موثقة.</p>
        <Link href="/rights/correction">طلب تصحيح معلومة</Link>
      </aside>
    </div>
  );
}

function Generic({ page }: { page: PageDef }) {
  if (page.kind === "offers")
    return (
      <>
        <div className="toolbar">
          <b>3 عروض توضيحية</b>
          <select>
            <option>الأحدث تحققاً</option>
          </select>
        </div>
        <div className="offers">
          {["متجر سومر", "بن بغداد", "مقهى المدى"].map((x, i) => (
            <div key={x}>
              <div>
                <b>{x}</b>
                <span>نموذج V1 · بغداد</span>
              </div>
              <strong>{["24,000", "25,500", "26,000"][i]} د.ع</strong>
              <small>تحقق قبل {i + 1} يوم</small>
              <button>فتح صفحة البائع داخل قهوتنا</button>
            </div>
          ))}
        </div>
        <div className="disclaimer">
          هذه بيانات تصميم توضيحية وليست عروضاً منشورة. عند الإطلاق يجب التحقق
          من السعر والتوفر وتاريخ المصدر.
        </div>
      </>
    );
  if (page.kind === "branches")
    return (
      <div className="branches">
        {["فرع الكرادة", "فرع المنصور"].map((x, i) => (
          <article key={x}>
            <div className="mapmini">
              <i />
            </div>
            <h3>{x}</h3>
            <p>
              {i
                ? "شارع 14 رمضان — قرب ساحة اللقاء"
                : "شارع الكرادة داخل — قرب ساحة عقبة"}
            </p>
            <span>السبت–الخميس · 8:00–22:00</span>
            <div>
              <button>فتح الخريطة ↗</button>
              <button>اتصال</button>
            </div>
          </article>
        ))}
      </div>
    );
  if (page.kind === "origins" || page.kind === "origin")
    return <Origins page={page} />;
  if (page.kind === "articles") return <Knowledge />;
  if (page.kind === "results")
    return (
      <div className="finder-result">
        <span className="score">94%</span>
        <h2>هذه أقرب الخيارات إلى ذوقك</h2>
        <p>فلتر · بدون حليب · فاكهية · حبوب كاملة</p>
        <Cards />
      </div>
    );
  return (
    <div className="generic">
      <div className="metric">
        <b>موثق</b>
        <span>مصدر وتاريخ مراجعة</span>
      </div>
      <div className="metric">
        <b>مرتبط</b>
        <span>منتجات وجهات ومحتوى</span>
      </div>
      <div className="metric">
        <b>شفاف</b>
        <span>الناقص يظهر بوضوح</span>
      </div>
      <section className="section">
        <h2>محتوى الصفحة</h2>
        <p>{page.desc}</p>
        <Cards
          type={page.path.startsWith("/coffee") ? "coffee" : "equipment"}
        />
      </section>
    </div>
  );
}

function PolicyPage({ page }: { page: PageDef }) {
  const privacy = page.path === "/privacy";
  const sections = privacy
    ? [
        ["البيانات التي ترسلها", "نحفظ فقط ما ترسله باختيارك في طلبات المساعدة والحقوق وملاحظات الاختبار، مع رقم مرجعي وحالة المعالجة. لا تطلب المنصة بيانات دفع أو كلمات مرور."],
        ["بيانات تبقى على جهازك", "المفضلة والمقارنة وإجابات Coffee Finder وتقدم مهام البيتا تحفظ محلياً في متصفحك، ولا ترتبط بحساب مستخدم في V1."],
        ["الاستخدام والمشاركة", "نستخدم الطلبات لمعالجة المشكلة وتحسين جودة المنصة. لا نبيع البيانات الشخصية. صفحات البائع والمنتجات تبقى داخل المنصة، أما واتساب أو أي رابط خارجي اختياري فيخضع لسياسة الجهة الخارجية."],
        ["التحكم والحقوق", "يمكنك طلب الوصول أو التصحيح أو الإزالة أو الاعتراض عبر مسارات الحقوق. تراجع الطلبات يدوياً ويقتصر الوصول عليها على فريق التشغيل المصرح."],
      ]
    : [
        ["دور المنصة", "قَهوتنا منصة اكتشاف ومقارنة تعرض المنتجات والعروض داخل صفحات البائعين في المنصة. لا تدير سلة أو دفعاً أو طلباً أو توصيلاً داخلياً في V1."],
        ["الأسعار والتوفر", "العرض سجل مؤرخ من بائع خارجي وقد يتغير بعد الرصد. تحقق من السعر والتوفر والضمان والشحن مباشرة لدى البائع قبل اتخاذ القرار."],
        ["المحتوى والمصادر", "نعرض الحقائق مع مستوى تحقق ومصدر وتاريخ مراجعة عندما تتوفر. البيانات الناقصة لا تُخمن، ويمكن لأصحاب الحقوق طلب التصحيح أو الإزالة."],
        ["الاستخدام المقبول", "لا تستخدم المنصة لإرسال معلومات مضللة أو انتهاك حقوق الآخرين أو محاولة الوصول غير المصرح إلى لوحة التشغيل. قد نوقف أي طلب يفتقر إلى دليل أو يسيء استخدام الخدمة."],
      ];
  return (
    <div className="generic policy-page">
      {sections.map(([title, copy]) => (
        <section className="section" key={title}>
          <h2>{title}</h2>
          <p>{copy}</p>
        </section>
      ))}
      <div className="rights-box">
        <b>{privacy ? "هل تريد ممارسة أحد حقوقك؟" : "هل وجدت معلومة تحتاج مراجعة؟"}</b>
        <p>استخدم النموذج المخصص ليصدر رقم مرجعي ويبقى القرار قابلاً للتدقيق.</p>
        <Link href="/rights/correction">فتح طلب حقوق</Link>
      </div>
      <small>آخر تحديث: 17 آب 2026 · نطاق النسخة: بغداد، العراق</small>
    </div>
  );
}

export default function Platform({ path }: { path: string }) {
  const page = pages.find((p) => p.path === path);
  const sellerOfferMatch = path.match(/^\/directory\/([^/]+)\/products\/([^/]+)$/);
  const reviewDirectorySlug = /^\/directory\/review\/[^/]+$/.test(path)
    ? path.split("/").filter(Boolean)[2]
    : null;
  const dynamicDirectorySlug =
    !page && /^\/directory\/[^/]+$/.test(path)
      ? path.split("/").filter(Boolean)[1]
      : null;
  const dynamicProductSlug =
    !page && /^\/(coffee|equipment)\/[^/]+$/.test(path)
      ? path.split("/").filter(Boolean)[1]
      : null;
  const dynamicProductSection = path.startsWith("/coffee/")
    ? "coffee"
    : "equipment";

  if (sellerOfferMatch)
    return (
      <>
        <Header />
        <main id="main-content" tabIndex={-1}>
          <PublishedSellerOffer sellerSlug={sellerOfferMatch[1]} productSlug={sellerOfferMatch[2]} />
        </main>
        <Footer />
      </>
    );

  if (reviewDirectorySlug)
    return (
      <>
        <Header />
        <main id="main-content" tabIndex={-1}>
          <ReviewOrganizationPage slug={reviewDirectorySlug} />
        </main>
        <Footer />
      </>
    );

  if (dynamicDirectorySlug)
    return (
      <>
        <Header />
        <main id="main-content" tabIndex={-1}>
          <PublishedOrganization slug={dynamicDirectorySlug} />
        </main>
        <Footer />
      </>
    );

  if (dynamicProductSlug)
    return (
      <>
        <Header />
        <main id="main-content" tabIndex={-1}>
          <PublishedProduct
            slug={dynamicProductSlug}
            section={dynamicProductSection}
          />
        </main>
        <Footer />
      </>
    );

  if (!page)
    return (
      <>
        <Header />
        <main id="main-content" tabIndex={-1}>
          <NotFoundPage />
        </main>
        <Footer />
      </>
    );

  let body;
  if (page.kind === "home") body = <Home />;
  else if (page.kind === "listing" || page.kind === "roasters")
    body = <Listing page={page} />;
  else if (page.kind === "families") body = <Families page={page} />;
  else if (page.kind === "finder") body = <Finder />;
  else if (["coffee-detail", "product", "roaster-detail"].includes(page.kind))
    body = <Detail page={page} />;
  else if (["directory", "org-list", "org"].includes(page.kind))
    body = <Directory page={page} />;
  else if (page.kind === "knowledge") body = <Knowledge />;
  else if (page.kind === "article") body = <Article page={page} />;
  else if (page.kind === "search") body = <SearchPage />;
  else if (page.kind === "compare") body = <Compare />;
  else if (page.kind === "favorites") body = <Favorites />;
  else if (page.kind === "form") body = <FormPage page={page} />;
  else if (page.kind === "partner") body = <PartnerPortal />;
  else if (page.kind === "beta-hub") body = <BetaHub />;
  else if (page.kind === "beta-feedback") body = <BetaFeedback />;
  else if (page.kind === "help-support") body = <HelpSupport />;
  else if (page.kind === "policy") body = <PolicyPage page={page} />;
  else body = <Generic page={page} />;
  return (
    <>
      <Header />
      <main id="main-content" tabIndex={-1}>
        {!(["home"] as string[]).includes(page.kind) && (
          <>
            <Breadcrumb page={page} />
            <section className="page-head">
              <span className="eyebrow">
                {page.eyebrow} · {page.id}
              </span>
              <h1>{page.title}</h1>
              <p>{page.desc}</p>
            </section>
          </>
        )}
        {body}
      </main>
      <Footer />
    </>
  );
}
