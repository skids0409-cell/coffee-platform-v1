"use client";
/* eslint-disable @next/next/no-img-element, @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  allSearchTypes,
  normalizeSearchText,
  type SearchEntityType,
  type SearchIntent,
  type SearchRequestType,
} from "@/lib/search-governance";
import { TaxonomyWorkspace } from "@/app/ui/admin/TaxonomyWorkspace";

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
type DataCenterBatch = {
  id: string;
  batch_code: string;
  entity_type: string;
  source_label: string;
  status: string;
  total_rows: number;
  valid_rows: number;
  rejected_rows: number;
  created_at: string;
  imported_at: string | null;
};

type DataCenterPreviewRow = {
  sourceRowNumber: number;
  normalized: { name_ar: string; address_ar: string; contact: string | null; role_type?: string };
  status: "valid" | "warning" | "invalid";
  messages: string[];
};

type DataCenterReference = {
  categories: Array<{ id: string; code: string; name_ar: string; parent_id: string | null; navigation_parent_id: string | null; is_navigation_visible: boolean; catalog_family_id: string | null; catalog_filter_id: string | null; catalog_product_kind: string | null; comparison_group: string | null }>;
  organizations: Array<{ id: string; name_ar: string; status: string; organization_roles: Array<{ role_type: string }> }>;
  products: Array<{ id: string; name_ar: string; product_kind: string; status: string; brand_id: string | null; owner_organization_id: string | null; brands: { name_ar: string } | null; organizations: { name_ar: string } | null; product_categories: Array<{ category_id: string; categories: { code: string; name_ar: string } | null }>; product_attribute_values: Array<{ value_text: string | null; value_json: unknown; field_definitions: { code: string } | null }> }>;
  brands: Array<{ id: string; name_ar: string; product_kinds: string[] }>;
  countries: Array<{ code: string; name_ar: string; coffee_regions: Array<{ id: string; name_ar: string }> }>;
  filterDefinitions: Array<{ category_id: string; id: string; code: string; name_ar: string; data_type: string; allowed_values: string[]; unit_code: string | null; is_required_for_publish: boolean; sort_order: number }>;
};

async function uploadCatalogMedia(entity: string, entityId: string, file: File, altAr: string, rightsNote: string) {
  const media = new FormData();
  media.set("entity", entity);
  media.set("entityId", entityId);
  media.set("file", file);
  media.set("altAr", altAr);
  media.set("rightsNote", rightsNote);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 60_000);
  try {
    return await fetch("/api/admin/media", { method: "POST", body: media, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

// Keep uploads small for reliable mobile submissions and predictable server
// memory usage before the API performs its independent validation.
const MAX_MEDIA_BYTES = 1024 * 1024;
const allowedMediaExtension = (name: string) => ["jpg", "jpeg", "png", "webp", "avif"].includes(name.toLowerCase().split(".").pop() || "");
async function prepareCatalogImage(file: File) {
  if (file.size <= MAX_MEDIA_BYTES) return { file, optimized: false };
  if (file.size > 40 * 1024 * 1024) throw new Error("file_too_large");
  const bitmap = await createImageBitmap(file);
  const maxDimension = 1800;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("image_processing_failed");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.82, 0.68, 0.54, 0.42]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.size <= MAX_MEDIA_BYTES) return { file: new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" }), optimized: true };
  }
  throw new Error("file_too_large");
}
const mediaErrorMessage = (reason?: string, receivedBytes?: number) => {
  if (reason === "file_too_large" || reason === "request_too_large") return `حجم الصورة ${((receivedBytes || 0) / 1024 / 1024).toFixed(1)}MB بعد المعالجة؛ تعذر جعله مناسباً للرفع. استخدم صورة أصغر أو بصيغة JPG/WebP.`;
  if (reason === "unsupported_type") return "صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WebP أو AVIF.";
  if (reason === "alt_required") return "اكتب وصفاً بديلاً للصورة من حرفين على الأقل.";
  if (reason === "rights_required") return "اكتب مصدر الصورة وحقوق استخدامها من ثلاثة أحرف على الأقل.";
  if (reason === "file_required") return "اختر ملف الصورة أولاً.";
  if (reason === "invalid_target") return "تعذر تحديد السجل الذي ستُربط به الصورة. أغلق النافذة وافتح السجل مجدداً.";
  if (reason === "storage_rejected") return "رفضت مكتبة الصور الملف قبل تخزينه. حدّث الصفحة وسجّل دخول الإدارة مجدداً، ثم جرّب JPG أو WebP أصغر.";
  if (reason === "media_link_failed") return "رُفع الملف مؤقتاً لكن تعذر ربطه بالسجل، لذلك أزيل تلقائياً ولم تُترك صورة يتيمة. حدّث الصفحة وحاول مجدداً.";
  if (reason === "upload_timeout") return "تجاوز الرفع دقيقة واحدة وأوقفناه بأمان. لم تُسجل الصورة؛ تحقق من الاتصال ثم أعد المحاولة.";
  return "تعذر رفع الصورة إلى مكتبة الوسائط. لم تُسجل الصورة؛ أعد المحاولة بعد تحديث الصفحة.";
};

function MultiChoiceField({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  const selected = value ? value.split(/,\s*/).filter(Boolean) : [];
  const toggle = (option: string) => {
    const next = selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option];
    onChange(next.join(", "));
  };
  return <div className="multi-choice-grid">{options.map((option) => <label className="multi-choice" key={option}><input type="checkbox" checked={selected.includes(option)} onChange={() => toggle(option)} /><span>{attributeValueLabels[option] || option}</span></label>)}</div>;
}

function CatalogDraftForm({ reference, contractRevision, onCreated }: { reference: DataCenterReference; contractRevision: string; onCreated: () => Promise<void> }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [entityType, setEntityType] = useState("product");
  const [entrySection, setEntrySection] = useState("coffee");
  const [productKind, setProductKind] = useState("roasted_coffee");
  const [productFamilyId, setProductFamilyId] = useState("");
  const [productCategoryId, setProductCategoryId] = useState("");
  const [draftAttributes, setDraftAttributes] = useState<Record<string,string>>({});
  const [offerProductKind, setOfferProductKind] = useState("roasted_coffee");
  const [offerFamilyId, setOfferFamilyId] = useState("");
  const [offerCategoryId, setOfferCategoryId] = useState("");
  const [offerCoffeeForm, setOfferCoffeeForm] = useState("");
  const [offerProductId, setOfferProductId] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<null | { entityType: string; payload: Record<string,string>; mediaFile: File | null; mediaOptimized: boolean; mediaAltAr: string; mediaRightsNote: string; attributes: Record<string,string> }>(null);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const invalidField = Array.from(formElement.elements).find((element) => element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement ? !element.validity.valid : false) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | undefined;
    if (invalidField) {
      const fieldLabels: Record<string, string> = { name_ar: "الاسم العربي", address_ar: "العنوان", owner_organization_id: "الجهة المنتجة أو المحمصة", source_label: "اسم المصدر", sourceConfirmed: "تأكيد مراجعة المصدر", title_ar: "العنوان العربي", body_ar: "النص العربي", product_id: "المنتج", seller_organization_id: "البائع أو جهة العرض", price: "السعر", external_url: "رابط توثيق العرض", country_code: "الدولة" };
      const missingLabel = fieldLabels[invalidField.name] || invalidField.name || "مطلوب";
      setMessage(`لا يمكن حفظ المسودة: أكمل حقل «${missingLabel}». تم تحديده باللون الأحمر.`);
      invalidField.setAttribute("aria-invalid", "true");
      invalidField.addEventListener("input", () => invalidField.removeAttribute("aria-invalid"), { once: true });
      invalidField.focus(); invalidField.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const form = new FormData(formElement);
    const payload = Object.fromEntries([...form.entries()].filter(([key]) => !["sourceConfirmed", "entityType", "mediaFile", "mediaAltAr", "mediaRightsNote"].includes(key)).map(([key, value]) => [key, String(value)]));
    const originalMediaFile = form.get("mediaFile");
    let mediaFile = originalMediaFile instanceof File ? originalMediaFile : null;
    let mediaOptimized = false;
    if (mediaFile && mediaFile.size > 0) {
      if (!allowedMediaExtension(mediaFile.name)) { setMessage(mediaErrorMessage("unsupported_type")); return; }
      try { const prepared = await prepareCatalogImage(mediaFile); mediaFile = prepared.file; mediaOptimized = prepared.optimized; } catch { setMessage(mediaErrorMessage("file_too_large", mediaFile.size)); return; }
      if (String(form.get("mediaAltAr") || "").trim().length < 2) { setMessage(mediaErrorMessage("alt_required")); return; }
      if (String(form.get("mediaRightsNote") || "").trim().length < 3) { setMessage(mediaErrorMessage("rights_required")); return; }
    }
    if (entityType === "product" && !productCategoryId) { setMessage("اختر الفئة الدقيقة من شريط الإدخال أعلى النموذج قبل الحفظ."); return; }
    if (entityType === "product" && productKind === "roasted_coffee" && coffeeFormField && !draftAttributes[coffeeFormField.id]) { setMessage("اختر شكل القهوة: حبوب كاملة أو مطحونة، قبل حفظ المسودة."); return; }
    if (entityType === "offer" && !offerProductId) { setMessage("اختر المنتج من القائمة المفلترة قبل حفظ العرض."); return; }
    setPendingDraft({ entityType, payload, mediaFile, mediaOptimized, mediaAltAr: String(form.get("mediaAltAr") || ""), mediaRightsNote: String(form.get("mediaRightsNote") || ""), attributes: { ...draftAttributes } });
    setMessage("راجع المعاينة أدناه. لم تُحفظ المسودة بعد.");
  };
  const createPendingDraft = async () => {
    if (!pendingDraft) return;
    const { entityType: pendingEntityType, payload, mediaFile, mediaOptimized, mediaAltAr, mediaRightsNote, attributes: pendingAttributes } = pendingDraft;
    setWorking(true);
    setMessage("");
    let response: Response;
    let result: any;
    try {
      response = await fetch("/api/admin/data-center", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create_catalog_draft", entityType: pendingEntityType, payload, attributes: Object.entries(pendingAttributes).map(([fieldId, value]) => ({ fieldId, value })).filter((item) => item.value.trim()), contractRevision, sourceConfirmed: true }) });
      result = await response.json();
    } catch {
      setWorking(false); setMessage("تعذر الاتصال بقاعدة البيانات. لم تُنشأ المسودة؛ حدّث الصفحة وسجّل دخول الإدارة ثم حاول مجدداً."); return;
    }
    setWorking(false);
    if (!response.ok) {
      setMessage(result.reason === "category_kind_mismatch" ? "الفئة المختارة لا تنتمي إلى نوع المنتج. اختر فئة من القائمة المفلترة."
        : result.reason === "brand_kind_mismatch" ? "العلامة المختارة مسجلة لعائلة منتجات مختلفة."
        : result.reason === "contract_revision_stale" || result.reason === "contract_revision_required" ? "تغيّر عقد التصنيف أثناء فتح النموذج. حدّث مركز الإدخال وراجع القيم قبل الحفظ."
        : ["invalid_attribute", "invalid_attribute_value", "duplicate_attribute"].includes(result.reason) ? "إحدى قيم المواصفات غير معتمدة لهذه الفئة. راجع القيم الظاهرة ثم أعد الحفظ."
        : result.reason === "duplicate_product" ? `يوجد منتج بهذا الاسم مسبقاً وحالته «${({ draft:"مسودة", in_review:"قيد المراجعة", published:"منشور", rejected:"مرفوض" } as Record<string,string>)[result.existing?.status] || result.existing?.status}». افتحه من السجلات بدلاً من إنشاء نسخة مكررة.`
        : result.reason === "duplicate_brand" ? `هذه العلامة موجودة مسبقاً وحالتها «${({ draft:"مسودة", in_review:"قيد المراجعة", published:"منشور", rejected:"مرفوض" } as Record<string,string>)[result.existing?.status] || result.existing?.status}». راجع السجل الموجود.`
        : result.reason === "duplicate_offer" ? `يوجد عرض سابق لهذا المنتج لدى البائع نفسه وحالته «${({ draft:"مسودة", in_review:"قيد المراجعة", published:"منشور", rejected:"مرفوض" } as Record<string,string>)[result.existing?.status] || result.existing?.status}». عدّله من السجلات بدلاً من تكراره.`
        : "تعذر إنشاء المسودة. تحقق من الحقول والمصدر والعلاقات المطلوبة.");
      return;
    }
    const createdId = String(result.created?.id || result.id || "");
    if (mediaFile instanceof File && mediaFile.size > 0) {
      const entityMap: Record<string, string> = { organization: "organizations", brand: "brands", product: "products", content: "contents", offer: "offers", origin: "origin_claims" };
      let mediaResponse: Response;
      try { mediaResponse = await uploadCatalogMedia(entityMap[pendingEntityType], createdId, mediaFile, mediaAltAr, mediaRightsNote); }
      catch (error) { setMessage(`تم إنشاء المسودة، لكن الصورة لم تُحفظ: ${mediaErrorMessage(error instanceof DOMException && error.name === "AbortError" ? "upload_timeout" : undefined)} افتح السجل من الطابور ولا تنشئ سجلاً ثانياً.`); await onCreated(); return; }
      if (!mediaResponse.ok) { const mediaResult = await mediaResponse.json().catch(() => ({})); setMessage(`تم إنشاء المسودة، لكن الصورة لم تُحفظ: ${mediaErrorMessage(mediaResult.reason, mediaResult.receivedBytes)} افتح السجل من الطابور ولا تنشئ منتجاً ثانياً.`); await onCreated(); return; }
    }
    formRef.current?.reset();
    setDraftAttributes({}); setProductCategoryId(""); setProductFamilyId("");
    setPendingDraft(null);
    setMessage(pendingEntityType === "origin" ? "تم ربط مصدر القهوة بالمنتج وتسجيل العملية." : pendingEntityType === "product" ? `تم إرفاق المنتج ومواصفاته ذرياً وربط الصورة إن وُجدت${mediaOptimized ? " بعد تحسين حجمها تلقائياً" : ""}. لن يظهر في البحث حتى اعتماده للنشر، ولن يظهر عند بائع حتى إنشاء «عرض وسعر» واعتماده.` : "تم إرفاق السجل وربط الصورة إن وُجدت. افتحه من طابور المراجعة لإكمال التدقيق.");
    await onCreated();
  };
  const categoryById = new Map(reference.categories.map((category) => [category.id, category]));
  const equipmentRoot = reference.categories.find((category) => category.code === "EQP");
  const equipmentFamilies = reference.categories.filter((category) => category.is_navigation_visible && category.navigation_parent_id === equipmentRoot?.id);
  const productSubcategories = reference.categories.filter((category) => category.is_navigation_visible && category.navigation_parent_id === productFamilyId);
  const coffeeCategory = reference.categories.find((category) => category.code === "COF-ROASTED");
  const matchingBrands = reference.brands.filter((brand) => !brand.product_kinds.length || brand.product_kinds.includes(productKind));
  const productFields = reference.filterDefinitions.filter((field)=>field.category_id===productCategoryId).sort((a,b)=>a.sort_order-b.sort_order);
  const coffeeFormField = reference.filterDefinitions.find((field) => field.code === "coffee_form");
  const offerProductsByKind = reference.products.filter((product) => product.product_kind === offerProductKind);
  const offerSubcategories = reference.categories.filter((category) => category.is_navigation_visible && category.navigation_parent_id === offerFamilyId);
  const productCoffeeForm = (product: DataCenterReference["products"][number]) => product.product_attribute_values?.find((item) => item.field_definitions?.code === "coffee_form")?.value_text || "";
  const offerProducts = offerProductsByKind.filter((product) => (!offerCategoryId || product.product_categories?.some((link) => {
    const assigned = categoryById.get(link.category_id);
    return assigned?.id === offerCategoryId || assigned?.catalog_filter_id === offerCategoryId;
  })) && (!offerCoffeeForm || productCoffeeForm(product) === offerCoffeeForm));
  const selectedOfferProduct = reference.products.find((product) => product.id === offerProductId);
  const sellerOrganizations = reference.organizations.filter((organization) => organization.organization_roles?.some((role) => ["seller", "cafe", "roaster", "equipment_supplier", "manufacturer", "importer"].includes(role.role_type)));
  const roleLabel: Record<string, string> = { cafe: "مقهى", seller: "بائع", roaster: "محمصة", equipment_supplier: "مورد معدات", manufacturer: "مصنّع", importer: "مستورد", service_provider: "مزود خدمة" };
  const entrySections = [
    ["coffee", "القهوة المحمصة"], ["equipment", "المعدات"], ["consumables", "المستهلكات"], ["care", "العناية والصيانة"], ["parts", "قطع الغيار"], ["directory", "الدليل والجهات"], ["brands", "العلامات التجارية"], ["offers", "العروض والأسعار"], ["origins", "مصادر القهوة"], ["learn", "التعلم والمعرفة"],
  ];
  const productKindLabel: Record<string, string> = { roasted_coffee: "قهوة محمصة", equipment: "معدات", consumable: "مستهلكات", care_product: "عناية وصيانة", replacement_part: "قطع غيار" };
  const changeEntrySection = (value: string) => {
    setEntrySection(value); setMessage(""); setProductCategoryId(""); setProductFamilyId(""); setDraftAttributes({}); setOfferFamilyId(""); setOfferCategoryId(""); setOfferCoffeeForm(""); setOfferProductId("");
    const productKinds: Record<string, string> = { coffee: "roasted_coffee", equipment: "equipment", consumables: "consumable", care: "care_product", parts: "replacement_part" };
    if (productKinds[value]) { setEntityType("product"); setProductKind(productKinds[value]); return; }
    if (value === "directory") setEntityType("organization");
    else if (value === "brands") setEntityType("brand");
    else if (value === "offers") setEntityType("offer");
    else if (value === "origins") setEntityType("origin");
    else setEntityType("content");
  };
  return (
    <section className="catalog-draft-entry">
      <div className="record-nature-picker" aria-label="تحديد طبيعة الإدخال">
        <div><b>أولاً: ما طبيعة السجل؟</b><span>هذا الاختيار يمنع خلط بطاقة المنتج العامة مع سعر وصور بائع محدد.</span></div>
        <button type="button" className={entityType === "product" ? "active" : ""} onClick={() => changeEntrySection(productKind === "roasted_coffee" ? "coffee" : "equipment")}><b>بطاقة منتج رئيسية</b><span>اسم، علامة، فئة ومواصفات مشتركة — بلا سعر بائع.</span></button>
        <button type="button" className={entityType === "offer" ? "active" : ""} onClick={() => changeEntrySection("offers")}><b>منتج لدى بائع</b><span>اختر بطاقة موجودة ثم اربط البائع والسعر وصوره الخاصة.</span></button>
      </div>
      <div className="data-entry-navigation">
        <div><span className="eyebrow">مدخل بيانات موحّد</span><h3>اختر القسم ثم الفئة الدقيقة</h3><p>نفس ترتيب وفلاتر «إدارة السجلات المنشورة» حتى يكون الإدخال والمراجعة متطابقين.</p></div>
        <label>قسم السجل<select value={entrySection} onChange={(event) => changeEntrySection(event.target.value)}>{entrySections.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        {entityType === "product" && <>{productKind === "roasted_coffee" ? <label>عائلة المنتج<select value={productCategoryId} onChange={(event) => { setProductCategoryId(event.target.value); setDraftAttributes({}); }}><option value="">اختر الفئة</option>{coffeeCategory && <option value={coffeeCategory.id}>{coffeeCategory.name_ar}</option>}</select></label> : <><label>العائلة الرئيسية للمعدات<select value={productFamilyId} onChange={(event) => { setProductFamilyId(event.target.value); setProductCategoryId(""); setDraftAttributes({}); }} required><option value="">اختر إحدى العوائل الخمس</option>{equipmentFamilies.map((category) => <option key={category.id} value={category.id}>{category.name_ar}</option>)}</select></label><label>التصنيف الفرعي<select value={productCategoryId} disabled={!productFamilyId} onChange={(event) => { const selected = categoryById.get(event.target.value); setProductCategoryId(event.target.value); if (selected?.catalog_product_kind) setProductKind(selected.catalog_product_kind); setDraftAttributes({}); }} required><option value="">{productFamilyId ? "اختر التصنيف الفرعي" : "اختر العائلة أولاً"}</option>{productSubcategories.map((category) => <option key={category.id} value={category.id}>{category.name_ar}</option>)}</select></label></>}{productKind === "roasted_coffee" && coffeeFormField && <label>شكل القهوة — الفئة الدقيقة<select value={draftAttributes[coffeeFormField.id] || ""} onChange={(event) => setDraftAttributes((current) => ({ ...current, [coffeeFormField.id]: event.target.value }))} required><option value="">اختر حبوباً أو مطحونة</option><option value="whole">حبوب كاملة</option><option value="ground">مطحونة</option></select></label>}</>}
        {entityType === "offer" && <><label>قسم المنتج<select value={offerProductKind === "roasted_coffee" ? "coffee" : "equipment"} onChange={(event) => { setOfferProductKind(event.target.value === "coffee" ? "roasted_coffee" : "equipment"); setOfferFamilyId(""); setOfferCategoryId(""); setOfferCoffeeForm(""); setOfferProductId(""); }}><option value="coffee">القهوة</option><option value="equipment">المعدات</option></select></label>{offerProductKind !== "roasted_coffee" && <><label>العائلة الرئيسية<select value={offerFamilyId} onChange={(event) => { setOfferFamilyId(event.target.value); setOfferCategoryId(""); setOfferProductId(""); }}><option value="">كل عوائل المعدات</option>{equipmentFamilies.map((category) => <option key={category.id} value={category.id}>{category.name_ar}</option>)}</select></label><label>التصنيف الفرعي<select value={offerCategoryId} disabled={!offerFamilyId} onChange={(event) => { const selected = categoryById.get(event.target.value); setOfferCategoryId(event.target.value); if (selected?.catalog_product_kind) setOfferProductKind(selected.catalog_product_kind); setOfferProductId(""); }}><option value="">{offerFamilyId ? "كل التصنيفات الفرعية" : "اختر العائلة أولاً"}</option>{offerSubcategories.map((category) => <option key={category.id} value={category.id}>{category.name_ar}</option>)}</select></label></>}{offerProductKind === "roasted_coffee" && <label>شكل القهوة<select value={offerCoffeeForm} onChange={(event) => { setOfferCoffeeForm(event.target.value); setOfferProductId(""); }}><option value="">حبوب ومطحونة</option><option value="whole">حبوب كاملة</option><option value="ground">مطحونة</option></select></label>}</>}
      </div>
      {message && <p className="admin-message" role="status">{message}</p>}
      <div className="admin-scope-explainer"><b>هذه الواجهة لإدارة المنصة فقط</b><span>البائع أو الجهة سيستخدم لاحقاً بوابة تقديم منفصلة؛ بياناته تدخل كمقترح ولا تصل للنشر دون مراجعتنا.</span></div>
      <form ref={formRef} className="catalog-draft-form" onSubmit={submit} noValidate>
        <input type="hidden" name="entityType" value={entityType} />
        {entityType === "organization" && <>
          <label>نوع الجهة<select name="role_type" required><option value="roaster">محمصة</option><option value="cafe">مقهى</option><option value="seller">بائع</option><option value="equipment_supplier">مورد معدات</option><option value="manufacturer">مصنّع</option><option value="importer">مستورد</option><option value="service_provider">مزود خدمة أو صيانة</option></select></label>
          <label>الاسم العربي<input name="name_ar" minLength={2} maxLength={160} required /></label><label>الاسم الإنجليزي<input name="name_en" maxLength={160} /></label>
          <label>المنطقة<input name="district_ar" maxLength={160} /></label><label className="wide">العنوان في بغداد<input name="address_ar" minLength={3} maxLength={400} required /></label>
          <label>الهاتف<input name="phone" maxLength={80} /></label><label>البريد<input name="email" type="email" maxLength={200} /></label><label>الموقع الإلكتروني<input name="website_url" type="url" /></label><label className="wide">وصف الجهة<textarea name="description_ar" rows={4} /></label>
        </>}
        {entityType === "brand" && <>
          <label>عائلة العلامة<select name="product_kind" required><option value="roasted_coffee">قهوة محمصة</option><option value="equipment">معدات</option><option value="consumable">مستهلكات</option><option value="care_product">عناية وصيانة</option><option value="replacement_part">قطع غيار</option></select></label>
          <label>اسم العلامة بالعربية<input name="name_ar" minLength={2} maxLength={160} required /></label><label>الاسم الإنجليزي<input name="name_en" maxLength={160} /></label><label>الموقع الرسمي<input name="website_url" type="url" /></label>
          <p className="wide">تُحفظ العلامة كمسودة، ثم تظهر في طابور «العلامات التجارية». بعد اعتمادها ستظهر فقط مع عائلة المنتجات المحددة.</p>
        </>}
        {entityType === "product" && <>
          <div className="catalog-stage-heading wide"><span>المرحلة 1</span><div><b>هوية المنتج</b><small>ما هو المنتج؟ وما الاسم الذي سيبحث عنه المستخدم؟</small></div></div>
          <fieldset className="catalog-form-stage wide"><legend>الهوية الأساسية</legend><div className="catalog-stage-grid">
            <div className="read-only-pair"><span>قسم المنتج</span><b>{productKindLabel[productKind]}</b><input type="hidden" name="product_kind" value={productKind} /></div>
            <label>الاسم العربي<input name="name_ar" minLength={2} maxLength={160} required /></label>
            <label>الاسم الإنجليزي<input name="name_en" maxLength={160} /></label>
            <label>رقم الموديل<input name="model_number" maxLength={160} /></label>
          </div></fieldset>
          <div className="catalog-stage-heading wide"><span>المرحلة 2</span><div><b>التصنيف والعلاقات</b><small>الفئة والعلامة والمنتِج؛ البائع يُربط لاحقاً من «عرض وسعر».</small></div></div>
          <fieldset className="catalog-form-stage wide"><legend>التصنيف والملكية</legend><div className="catalog-stage-grid">
            <div className="read-only-pair"><span>الفئة المتوافقة</span><b>{reference.categories.find((category) => category.id === productCategoryId)?.name_ar || "اختر الفئة من شريط الإدخال أعلاه"}</b><input type="hidden" name="category_id" value={productCategoryId} /></div>
            <label>{productKind === "roasted_coffee" ? "علامة القهوة" : "العلامة التجارية"}<select name="brand_id"><option value="">غير محددة بعد</option>{matchingBrands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name_ar}</option>)}</select><small>{matchingBrands.length.toLocaleString("ar-IQ")} علامة منشورة لهذا النوع. أضف العلامة أولاً ولا تنسب المنتج إلى علامة غير صحيحة.</small><button className="inline-create-action" type="button" onClick={() => changeEntrySection("brands")}>+ إدخال علامة جديدة يدوياً</button></label>
            <label className="wide">الجهة المنتجة أو المالكة للمنتج<select name="owner_organization_id" required={productKind === "roasted_coffee"}><option value="">غير محددة</option>{reference.organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name_ar}</option>)}</select><small>ليست جهة البيع. ظهور المنتج في متجر بائع داخل قهوتنا يحتاج عرضاً مرتبطاً ومنشوراً.</small></label>
          </div></fieldset>
          <div className="catalog-stage-heading wide"><span>المرحلة 3</span><div><b>المحتوى والمواصفات</b><small>وصف المستخدم ثم الحقول المنظمة الخاصة بالفئة المختارة.</small></div></div>
          <fieldset className="catalog-form-stage wide"><legend>المحتوى الظاهر</legend><div className="catalog-stage-grid"><label className="wide">ملخص عربي <small>جملة قصيرة تظهر في بطاقات البحث والقوائم.</small><textarea name="summary_ar" rows={3} maxLength={1000} /></label><label className="wide">وصف عربي <small>تفاصيل المنتج التي تظهر في صفحته.</small><textarea name="description_ar" rows={5} maxLength={4000} /></label></div></fieldset>
          <div className="product-publication-path wide"><b>مسار الظهور العام</b><span>١) حفظ المنتج كمسودة ← ٢) تدقيقه واعتماده للنشر ← ٣) إذا كان يباع لدى جهة: إنشاء «عرض وسعر» وربطه بالمنتج والجهة ثم اعتماده. عندها يظهر في البحث وصفحة البائع.</span></div>
          {productCategoryId && <fieldset className="attribute-editor wide"><legend>مواصفات الفئة نفسها المستخدمة عند التعديل</legend><p>هذه الحقول مولدة من الفئة المختارة؛ لذلك لا تظهر مواصفات القهوة للمطاحن ولا السعر ضمن المنتج.</p>{productFields.filter((field) => field.code !== "coffee_form").map((field)=>{const value=draftAttributes[field.id]||"";const update=(next:string)=>setDraftAttributes((current)=>({...current,[field.id]:next}));return <label key={field.id}><span>{field.name_ar}{field.is_required_for_publish?" — مطلوبة للنشر":" — اختيارية"}</span>{field.data_type==="enum"?<select value={value} onChange={(event)=>update(event.target.value)}><option value="">غير محدد</option>{(field.allowed_values||[]).map((option)=><option key={option} value={option}>{attributeValueLabels[option]||option}</option>)}</select>:field.data_type==="multi_enum"&&field.allowed_values?.length?<MultiChoiceField value={value} options={field.allowed_values} onChange={update}/>:field.data_type==="reference"&&field.code==="roaster_org_id"?<select value={value} onChange={(event)=>update(event.target.value)}><option value="">غير محدد</option>{reference.organizations.map((organization)=><option key={organization.id} value={organization.id}>{organization.name_ar}</option>)}</select>:field.data_type==="boolean"?<select value={value} onChange={(event)=>update(event.target.value)}><option value="">غير محدد</option><option value="true">نعم</option><option value="false">لا</option></select>:<input type={["integer","decimal"].includes(field.data_type)?"number":field.data_type==="date"?"date":"text"} value={value} onChange={(event)=>update(event.target.value)} placeholder={field.unit_code||"أدخل القيمة الموثقة"}/>}</label>})}</fieldset>}
        </>}
        {entityType === "content" && <>
          <label>نوع المحتوى<select name="content_type" required><option value="article">مقالة</option><option value="guide">دليل</option><option value="lesson">درس</option><option value="glossary">مصطلح</option></select></label>
          <label>العنوان العربي<input name="title_ar" minLength={3} maxLength={200} required /></label>
          <label>العنوان الإنجليزي<input name="title_en" maxLength={200} /></label>
          <label className="wide">المقتطف<textarea name="excerpt_ar" rows={2} maxLength={1000} /></label>
          <label className="wide">النص العربي<textarea name="body_ar" rows={8} minLength={20} maxLength={20000} required /></label>
        </>}
        {entityType === "offer" && <>
          <div className="offer-linking-guide wide"><b>ربط العرض بالمنتج والبائع</b><span>اختر العائلة ثم الفئة ثم المنتج. العرض لا ينشئ منتجاً جديداً؛ بل يربط المنتج الموجود بجهة تبيعه وسعره لديها.</span></div>
          <label>1. المنتج<select name="product_id" value={offerProductId} onChange={(event) => setOfferProductId(event.target.value)} required><option value="">اختر المنتج</option>{offerProducts.map((product) => <option key={product.id} value={product.id}>{product.name_ar} · {product.status === "published" ? "منشور" : product.status === "in_review" ? "قيد المراجعة" : "مسودة"}</option>)}</select></label>
          <label>2. البائع أو جهة العرض<select name="seller_organization_id" required><option value="">اختر البائع</option>{sellerOrganizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name_ar} · {(organization.organization_roles || []).map((role) => roleLabel[role.role_type] || role.role_type).join("، ")}</option>)}</select></label>
          {selectedOfferProduct && <div className="offer-product-context wide"><b>{selectedOfferProduct.name_ar}</b><span>الفئة: {selectedOfferProduct.product_categories?.[0]?.categories?.name_ar || "غير محددة"}</span><span>العلامة: {selectedOfferProduct.brands?.name_ar || "غير محددة"}</span><span>المنتج/المالك: {selectedOfferProduct.organizations?.name_ar || "غير محدد"}</span><span className={selectedOfferProduct.status === "published" ? "ready-text" : "danger-text"}>{selectedOfferProduct.status === "published" ? "يظهر العرض للعامة بعد اعتماده" : "المنتج غير منشور؛ سيُحفظ العرض لكنه لن يظهر للعامة حتى نشر المنتج"}</span></div>}
          <label>السعر<input name="price" type="number" min="0" step="0.001" required /></label>
          <label>العملة<input name="currency_code" value="IQD" readOnly /></label>
          <label>التوفر<select name="availability" required><option value="in_stock">متوفر</option><option value="out_of_stock">غير متوفر</option><option value="preorder">طلب مسبق</option><option value="unknown">غير متحقق</option></select></label>
          <label>رابط توثيق العرض<input name="external_url" type="url" required /><small>مرجع إداري للتحقق من السعر والتوفر؛ لا يظهر للمستخدم كوجهة شراء.</small></label>
          <label>تاريخ الرصد<input name="observed_at" type="datetime-local" /></label>
        </>}
        {entityType === "origin" && <>
          <label>منتج القهوة<select name="product_id" required><option value="">اختر القهوة</option>{reference.products.filter((product) => product.product_kind === "roasted_coffee").map((product) => <option key={product.id} value={product.id}>{product.name_ar}</option>)}</select></label>
          <label>الدولة<select name="country_code" required><option value="">اختر الدولة</option>{reference.countries.map((country) => <option key={country.code} value={country.code}>{country.name_ar}</option>)}</select></label>
          <label>المنطقة<select name="coffee_region_id"><option value="">غير محددة</option>{reference.countries.flatMap((country) => country.coffee_regions.map((region) => <option key={region.id} value={region.id}>{country.name_ar} — {region.name_ar}</option>))}</select></label>
          <label>المزرعة أو المنتج<input name="farm_or_producer_name" maxLength={300} /></label>
          <label>المعالجة<input name="process_code" maxLength={120} /></label>
          <label>السلالات، مفصولة بفاصلة<input name="variety_codes" maxLength={500} /></label>
          <label>الموسم<input name="harvest_label" maxLength={120} /></label>
          <label>مرجع الدفعة<input name="lot_reference" maxLength={160} /></label>
        </>}
        {entityType === "product" && <div className="catalog-stage-heading wide"><span>المرحلة 4</span><div><b>المصدر والصورة</b><small>وثّق من أين جاءت البيانات، وارفع الصورة المرخصة مع وصفها وحقوقها.</small></div></div>}
        <fieldset className="source-fields">
          <legend>الدليل والمصدر</legend>
          <p className="wide">المصدر هو المكان الذي أخذنا منه المعلومة، مثل صفحة المحمصة الرسمية أو موقع المصنّع أو صفحة البائع. لا يقصد به اسم الموظف الذي أدخل البيانات.</p>
          <label>اسم المصدر<input name="source_label" minLength={3} maxLength={180} placeholder="مثال: صفحة قهوة العزاوي الرسمية" required /></label>
          <label>نوع المصدر<select name="source_type" defaultValue="editorial"><option value="manufacturer">المصنّع الرسمي</option><option value="organization">الجهة أو المحمصة الرسمية</option><option value="seller">صفحة البائع</option><option value="research">بحث أو دراسة</option><option value="editorial">رصد ومراجعة فريق المنصة</option><option value="other">مصدر آخر</option></select></label>
          <label>رابط المصدر<input name="source_url" type="url" /></label>
          <label className="wide">ملاحظة الدليل<textarea name="evidence_note" rows={2} maxLength={1000} /></label>
        </fieldset>
        <fieldset className="media-fields">
          <legend>الصورة والحقوق (اختياري)</legend>
          <p className="wide">JPG أو PNG أو WebP أو AVIF. تُضغط الصور الأكبر من 1MB تلقائياً قبل الإرسال لتجاوز حد بوابة الرفع بأمان، ويمكن اختيار ملف أصلي حتى 40MB.</p>
          <label className="wide">تحميل الصورة<input name="mediaFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif" /></label>
          <label>الوصف البديل للصورة<input name="mediaAltAr" maxLength={300} placeholder="مثال: مطحنة DF54 سوداء من الأمام" /></label>
          <label>حقوق الصورة ومصدرها<input name="mediaRightsNote" maxLength={1000} placeholder="مثال: صورة رسمية بإذن الشركة أو تصوير فريق المنصة" /></label>
          <small className="wide">إذا اخترت صورة يصبح الوصف البديل وبيان الحقوق إلزاميين.</small>
        </fieldset>
        {entityType === "product" && <div className="catalog-stage-heading wide"><span>المرحلة 5</span><div><b>المراجعة والحفظ</b><small>سيُنشأ سجل مسودة فقط؛ راجعه من الطابور قبل النشر.</small></div></div>}
        <label className="check wide"><input name="sourceConfirmed" type="checkbox" required /> راجعت الحقول والمصدر وأوافق على إنشاء مسودة غير منشورة</label>
        <button type="submit" disabled={working}>{working ? "جارٍ الفحص…" : "معاينة المعلومات قبل الحفظ"}</button>
      </form>
      {pendingDraft && <section className="draft-confirmation" aria-live="polite">
        <div className="section-head"><div><span className="eyebrow">الخطوة الأخيرة</span><h3>معاينة المسودة قبل إنشائها</h3></div><span className="draft-safety">لم تُحفظ بعد</span></div>
        <p>راجع الهوية والعلاقات والمصدر والصورة. إذا وجدت خطأ ارجع وعدّل الحقول، وإذا كانت صحيحة أنشئ المسودة.</p>
        <dl>
          <div><dt>نوع السجل</dt><dd>{({ product: "بطاقة منتج رئيسية", offer: "عرض بائع وسعر", organization: "جهة في الدليل", brand: "علامة تجارية", content: "محتوى معرفي", origin: "مصدر قهوة" } as Record<string,string>)[pendingDraft.entityType]}</dd></div>
          <div><dt>الاسم</dt><dd>{pendingDraft.payload.name_ar || pendingDraft.payload.title_ar || reference.products.find((item) => item.id === pendingDraft.payload.product_id)?.name_ar || "—"}</dd></div>
          {pendingDraft.payload.category_id && <div><dt>الفئة</dt><dd>{reference.categories.find((item) => item.id === pendingDraft.payload.category_id)?.name_ar || pendingDraft.payload.category_id}</dd></div>}
          {pendingDraft.payload.brand_id && <div><dt>العلامة</dt><dd>{reference.brands.find((item) => item.id === pendingDraft.payload.brand_id)?.name_ar || "—"}</dd></div>}
          {pendingDraft.payload.owner_organization_id && <div><dt>الجهة المالكة</dt><dd>{reference.organizations.find((item) => item.id === pendingDraft.payload.owner_organization_id)?.name_ar || "—"}</dd></div>}
          {pendingDraft.payload.seller_organization_id && <div><dt>البائع</dt><dd>{reference.organizations.find((item) => item.id === pendingDraft.payload.seller_organization_id)?.name_ar || "—"}</dd></div>}
          {pendingDraft.payload.price && <div><dt>السعر</dt><dd>{Number(pendingDraft.payload.price).toLocaleString("ar-IQ")} {pendingDraft.payload.currency_code || "IQD"}</dd></div>}
          <div><dt>المصدر</dt><dd>{pendingDraft.payload.source_label || "—"}</dd></div>
          <div><dt>الصورة</dt><dd>{pendingDraft.mediaFile ? `${pendingDraft.mediaFile.name} · ${pendingDraft.mediaAltAr} · ${pendingDraft.mediaRightsNote}` : "لا توجد صورة في هذه المسودة"}</dd></div>
        </dl>
        <div className="queue-actions"><button className="primary" type="button" disabled={working} onClick={createPendingDraft}>{working ? "جارٍ إنشاء المسودة…" : "تأكيد وإنشاء المسودة"}</button><button type="button" disabled={working} onClick={() => { setPendingDraft(null); setMessage("عُدّل وضع المعاينة؛ غيّر الحقول ثم افتح المعاينة من جديد."); formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>العودة للتعديل</button></div>
      </section>}
    </section>
  );
}

function DataCenter({ onChanged, mode = "entry" }: { onChanged: () => Promise<void>; mode?: "entry" | "imports" }) {
  const [batches, setBatches] = useState<DataCenterBatch[]>([]);
  const [preview, setPreview] = useState<DataCenterPreviewRow[]>([]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState("");
  const [batchDetails, setBatchDetails] = useState<{ batch: DataCenterBatch; rows: Array<{ id: string; source_row_number: number; normalized_payload: Record<string, unknown>; validation_status: string; validation_messages: string[]; target_table: string | null; target_id: string | null }> } | null>(null);
  const [reference, setReference] = useState<DataCenterReference>({ categories: [], organizations: [], products: [], brands: [], countries: [], filterDefinitions: [] });
  const [recordContractRevision, setRecordContractRevision] = useState("");

  const load = async () => {
    const response = await fetch("/api/admin/data-center", { cache: "no-store" });
    if (!response.ok) throw new Error("load_failed");
    const data = await response.json();
    setBatches(data.batches || []);
    setReference(data.referenceData || { categories: [], organizations: [], products: [], brands: [], countries: [], filterDefinitions: [] });
    setRecordContractRevision(data.recordContractRevision || "");
  };

  useEffect(() => {
    const handle = window.setTimeout(() => load().catch(() => setMessage("تعذر تحميل سجل دفعات البيانات.")), 0);
    return () => window.clearTimeout(handle);
  }, []);

  const responseMessage = (reason?: string) => {
    if (reason === "missing_headers") return "يجب أن يحتوي الملف على عمودي «اسم الجهة» (أو اسم الكافيه للتوافق) و«عنوان».";
    if (reason === "too_many_rows") return "الحد الأعلى للدفعة الواحدة 500 سجل.";
    if (reason === "source_confirmation_required") return "اكتب اسم المصدر وأكد أنك راجعت البيانات.";
    if (reason === "market_not_enabled") return "سوق هذه المحافظة غير مفعّل في نسخة الاختبار الحالية.";
    if (reason === "no_valid_rows") return "لم نجد سجلاً صالحاً للاستيراد؛ راجع الأخطاء في المعاينة.";
    return "تعذر تنفيذ العملية. لم تُنشر أي بيانات.";
  };

  const submitManual = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setWorking("manual");
    setMessage("");
    const response = await fetch("/api/admin/data-center", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create_manual_draft",
        name: form.get("name"),
        address: form.get("address"),
        contact: form.get("contact"),
        roleType: form.get("roleType"),
        marketCode: form.get("marketCode"),
        sourceLabel: form.get("sourceLabel"),
        sourceConfirmed: form.get("sourceConfirmed") === "on",
      }),
    });
    const data = await response.json();
    setWorking("");
    setPreview(data.preview || []);
    if (!response.ok) {
      setMessage(responseMessage(data.reason));
      return;
    }
    setBatches(data.batches || []);
    formElement.reset();
    setMessage("تم إنشاء الجهة وموقعها ودورها كمسودة موثقة. أرسلها للمراجعة من الطابور أدناه.");
    await onChanged();
  };

  const submitCsv = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("csvFile");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) {
      setMessage("اختر ملف CSV صالحاً.");
      return;
    }
    setWorking("csv");
    setMessage("جارٍ فحص الملف ومنع التكرار…");
    const csvText = await file.text();
    const response = await fetch("/api/admin/data-center", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "stage_csv",
        csvText,
        marketCode: form.get("marketCode"),
        sourceLabel: form.get("sourceLabel"),
        sourceConfirmed: form.get("sourceConfirmed") === "on",
      }),
    });
    const data = await response.json();
    setWorking("");
    setPreview(data.preview || []);
    if (!response.ok) {
      setMessage(responseMessage(data.reason));
      return;
    }
    setBatches(data.batches || []);
    setMessage("اكتمل التحقق. راجع المعاينة ثم اضغط «تحويل إلى مسودات» على الدفعة.");
  };

  const importBatch = async (batchId: string) => {
    if (!window.confirm("سيتم إنشاء السجلات الصالحة كمسودات فقط، ولن يظهر شيء للعامة. هل تريد المتابعة؟")) return;
    setWorking(batchId);
    setMessage("");
    const response = await fetch("/api/admin/data-center", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "import_batch", batchId }),
    });
    const data = await response.json();
    setWorking("");
    if (!response.ok) {
      setMessage(responseMessage(data.reason));
      return;
    }
    setBatches(data.batches || []);
    setMessage(`تم إنشاء ${Number(data.imported?.imported || 0).toLocaleString("ar-IQ")} مسودة. راجعها في طابور الجهات.`);
    await onChanged();
  };

  const openBatch = async (batchId: string) => {
    setWorking(`details-${batchId}`);
    const response = await fetch(`/api/admin/data-center?batchId=${batchId}`, { cache: "no-store" });
    const data = await response.json();
    setWorking("");
    if (!response.ok) { setMessage("تعذر فتح تفاصيل الدفعة."); return; }
    setBatchDetails(data);
  };

  const changeBatchArchive = async (batch: DataCenterBatch) => {
    if (!window.confirm("ستنقل الدفعة المكتملة إلى قسم الأرشيف الرئيسي ويمكن استعادتها لاحقاً. هل تريد المتابعة؟")) return;
    setWorking(`archive-${batch.id}`);
    const response = await fetch("/api/admin/data-center", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "archive_batch", batchId: batch.id }) });
    const data = await response.json();
    setWorking("");
    if (!response.ok) { setMessage("لا يمكن أرشفة دفعة غير مكتملة. عالجها أو ارفضها أولاً."); return; }
    setBatches(data.batches || []);
    setBatchDetails(null);
    setMessage("نُقلت الدفعة إلى قسم الأرشيف الرئيسي.");
  };

  const visibleBatches = batches.filter((batch) => batch.status !== "archived");
  const batchStatusLabel = (value: string) => ({ ready: "جاهزة للتحويل", imported: "تم الاستيراد", rejected: "مرفوضة", archived: "مؤرشفة", draft: "مسودة", validating: "قيد الفحص" }[value] || value);

  return (
    <section className={`data-center data-center-${mode}`} id={mode === "entry" ? "operations-data-entry" : "operations-imports"}>
      <div className="section-head">
        <div>
          <span className="eyebrow">Operations Center V3</span>
          <h2>{mode === "entry" ? "إضافة سجل جديد" : "الاستيراد الجماعي وسجل الدفعات"}</h2>
        </div>
        <span className="draft-safety">كل إدخال يبدأ كمسودة</span>
      </div>
      <p>{mode === "entry" ? "مدخل موحّد للجهات والعلامات والقهوة والمعدات والعروض والمصادر والمحتوى. اختر القسم والفئة أولاً، ثم راجع المعاينة قبل إنشاء المسودة." : "ارفع CSV، افحص الصفوف، ثم حوّل السجلات السليمة إلى مسودات. لا تنشر عملية الاستيراد أي سجل تلقائياً."}</p>
      <div className="market-scope-note">
        <b>النطاق الجغرافي للدليل في الاختبار الحالي: محافظة بغداد</b>
        <span>هذا القيد يخص عناوين الجهات والفروع فقط، ولا يمنع إدخال المنتجات أو العلامات أو المحتوى المعرفي.</span>
      </div>
      {message && <p className="admin-message" role="status">{message}</p>}
      {mode === "entry" && <CatalogDraftForm reference={reference} contractRevision={recordContractRevision} onCreated={async () => { await load(); await onChanged(); }} />}
      {mode === "imports" && <div className="bulk-intake">
      <div className="subsection-head"><h3>دفعات الجهات المشاركة في المنصة</h3><span>مقاهٍ، محامص، بائعون، موردون، ومراكز خدمة أو تدريب</span></div>
      <div className="data-entry-grid">
        <form onSubmit={submitManual}>
          <h3>إدخال سجل واحد</h3>
          <label>المحافظة<select name="marketCode" defaultValue="IQ-BGD"><option value="IQ-BGD">بغداد — سوق الاختبار الحالي</option></select></label>
          <label>نوع الجهة<select name="roleType" defaultValue="cafe"><option value="cafe">مقهى</option><option value="roaster">محمصة</option><option value="seller">بائع أو متجر</option><option value="equipment_supplier">مورد معدات</option><option value="manufacturer">مصنّع</option><option value="importer">مستورد</option><option value="service_provider">مركز تعليم/تدريب أو مزود خدمة</option></select></label>
          <label>اسم الجهة<input name="name" minLength={2} maxLength={160} required /></label>
          <label>العنوان في بغداد<input name="address" minLength={3} maxLength={400} required /></label>
          <label>التواصل (اختياري)<input name="contact" maxLength={300} placeholder="@instagram أو رقم أو رابط" /></label>
          <label>اسم المصدر<input name="sourceLabel" minLength={3} maxLength={180} placeholder="مثال: قائمة مقاهي بغداد — إنستغرام" required /></label>
          <label className="check"><input name="sourceConfirmed" type="checkbox" required /> راجعت الاسم والعنوان وأعتبرهما صحيحين</label>
          <button type="submit" disabled={working === "manual"}>{working === "manual" ? "جارٍ الحفظ…" : "حفظ كمسودة"}</button>
        </form>
        <form onSubmit={submitCsv}>
          <h3>استيراد ملف CSV</h3>
          <p>الأعمدة المقبولة: <b>اسم الجهة، نوع الجهة، عنوان، تواصل</b>. نوع الجهة اختياري ويُعامل كمقهى عند غيابه للتوافق مع الملفات القديمة.</p>
          <label>المحافظة لكل الملف<select name="marketCode" defaultValue="IQ-BGD"><option value="IQ-BGD">بغداد — سوق الاختبار الحالي</option></select></label>
          <label>الملف<input name="csvFile" type="file" accept=".csv,text/csv" required /></label>
          <label>اسم المصدر<input name="sourceLabel" minLength={3} maxLength={180} placeholder="اسم الحساب أو القائمة وتاريخها" required /></label>
          <label className="check"><input name="sourceConfirmed" type="checkbox" required /> راجعت البيانات وأسمح بتحويل الصالح منها إلى مسودات</label>
          <button type="submit" disabled={working === "csv"}>{working === "csv" ? "جارٍ التحقق…" : "فحص الملف أولاً"}</button>
        </form>
      </div>
      {preview.length > 0 && (
        <div className="data-preview">
          <h3>معاينة التحقق <span>{preview.length}</span></h3>
          <div className="data-table" role="table" aria-label="نتيجة فحص ملف البيانات">
            <div className="head" role="row"><span>الصف</span><span>الجهة ونوعها</span><span>العنوان</span><span>النتيجة</span></div>
            {preview.slice(0, 50).map((row) => (
              <div role="row" key={`${row.sourceRowNumber}-${row.normalized.name_ar}`}>
                <span>{row.sourceRowNumber}</span>
                <b>{row.normalized.name_ar || "—"} · {row.normalized.role_type || "cafe"}</b>
                <span>{row.normalized.address_ar || "—"}</span>
                <span className={`intake-status ${row.status}`}>{row.status === "valid" ? "صالح" : row.status === "warning" ? "تنبيه" : "مرفوض"}{row.messages.length ? ` — ${row.messages.join("، ")}` : ""}</span>
              </div>
            ))}
          </div>
          {preview.length > 50 && <small>تظهر أول 50 نتيجة فقط؛ تم فحص جميع الصفوف.</small>}
        </div>
      )}
      <div className="batch-list">
        <div className="subsection-head"><div><h3>سجل الدفعات النشطة</h3><span>الدفعة المؤرشفة تنتقل إلى قسم «الأرشيف» الرئيسي ولا تبقى هنا.</span></div></div>
        {visibleBatches.length ? visibleBatches.map((batch) => (
          <article key={batch.id}>
            <div><b>{batch.source_label}</b><span>{batch.entity_type === "organization" ? "جهات مشاركة" : batch.entity_type} · {new Date(batch.created_at).toLocaleDateString("ar-IQ")} · المرجع {batch.batch_code}</span><span>{batch.total_rows} سجل · {batch.valid_rows} صالح · {batch.rejected_rows} مرفوض</span></div>
            <div className="queue-actions">
              <span className={`batch-status ${batch.status}`}>{batchStatusLabel(batch.status)}</span>
              <button type="button" disabled={working === `details-${batch.id}`} onClick={() => openBatch(batch.id)}>عرض التفاصيل</button>
              {batch.status === "ready" && <button type="button" disabled={working === batch.id} onClick={() => importBatch(batch.id)}>{working === batch.id ? "جارٍ التحويل…" : "تحويل إلى مسودات"}</button>}
              {["imported", "rejected"].includes(batch.status) && <button type="button" disabled={working === `archive-${batch.id}`} onClick={() => changeBatchArchive(batch)}>حفظ في الأرشيف</button>}
            </div>
          </article>
        )) : <p>لا توجد دفعات بعد.</p>}
      </div>
      </div>}
      {batchDetails && <div className="batch-details" role="dialog" aria-modal="true"><section><div className="section-head"><div><span className="eyebrow">تفاصيل الدفعة</span><h3>{batchDetails.batch.source_label}</h3></div><button type="button" onClick={() => setBatchDetails(null)}>إغلاق</button></div><p>{batchDetails.batch.batch_code} · {batchStatusLabel(batchDetails.batch.status)}</p><div className="data-table" role="table"><div className="head" role="row"><span>الصف</span><span>الاسم</span><span>العنوان</span><span>النتيجة</span></div>{batchDetails.rows.map((row) => <div role="row" key={row.id}><span>{row.source_row_number}</span><b>{String(row.normalized_payload?.name_ar || "—")}</b><span>{String(row.normalized_payload?.address_ar || "—")}</span><span>{row.validation_status}{row.validation_messages?.length ? ` — ${row.validation_messages.join("، ")}` : ""}</span></div>)}</div></section></div>}
    </section>
  );
}

type EditorAttribute = { fieldId: string; value: string };

const attributeValueLabels: Record<string, string> = {
  whole: "حبوب كاملة", ground: "مطحونة", espresso: "إسبريسو", filter: "فلتر", turkish: "تركية", moka_pot: "موكا بوت", french_press: "فرنش بريس", cold_brew: "كولد برو",
  single_origin: "منشأ واحد", blend: "خلطة", light: "فاتح", medium_light: "فاتح متوسط", medium: "متوسط", medium_dark: "متوسط داكن", dark: "داكن", other_declared: "آخر كما أعلنه المصدر",
  chocolate_cocoa: "شوكولاتة وكاكاو", sweet_caramel: "حلاوة وكراميل", nutty: "مكسرات", fruity: "فواكه", floral_tea: "زهور وشاي", regular: "عادي", decaf: "منزوع الكافيين", half_caf: "نصف كافيين", unknown: "غير معروف",
  manual: "يدوي", electric: "كهربائي", burr: "شفرات طحن", blade: "سكاكين", other: "آخر", flat: "مسطحة", conical: "مخروطية", not_applicable: "لا ينطبق", stepped: "درجات", stepless: "مستمر", fixed: "ثابت", single_dose: "جرعة واحدة", hopper: "حاوية", both: "كلاهما",
};

function ReviewRecordEditor({ entity, id, canRestore, onClose, onSaved }: { entity: string; id: string; canRestore: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const [data, setData] = useState<any>(null);
  const [attributes, setAttributes] = useState<EditorAttribute[]>([]);
  const [issueUpdates, setIssueUpdates] = useState<Array<{ id: string; status: string; resolutionNote: string }>>([]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [mediaWorking, setMediaWorking] = useState("");
  const [mediaFileInfo, setMediaFileInfo] = useState("");
  const [mediaAltText, setMediaAltText] = useState("");
  const [mediaRightsText, setMediaRightsText] = useState("");
  const [editorCategoryId, setEditorCategoryId] = useState("");
  const [editorFamilyId, setEditorFamilyId] = useState("");
  const [revisionKey, setRevisionKey] = useState(0);
  useEffect(() => {
    let active = true;
    fetch(`/api/admin/records?entity=${encodeURIComponent(entity)}&id=${encodeURIComponent(id)}`, { cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.reason || "load_failed");
      if (!active) return;
      setData(result);
      const existingValues = new Map((result.record?.product_attribute_values || []).map((attribute: any) => {
        const jsonValue = attribute.value_json;
        const displayJson = Array.isArray(jsonValue) && ["multi_enum", "reference"].includes(attribute.field_definitions?.data_type) ? jsonValue.join(", ") : jsonValue ? JSON.stringify(jsonValue) : "";
        return [attribute.field_definition_id, String(attribute.value_text ?? attribute.value_integer ?? attribute.value_decimal ?? attribute.value_boolean ?? attribute.value_date ?? displayJson)];
      }));
      const values = (result.fieldDefinitions || []).map((field: any) => ({ fieldId: field.id, value: String(existingValues.get(field.id) || "") }));
      setAttributes(values);
      const selectedCategory = result.record?.product_categories?.find((item: any)=>item.is_primary)?.category_id || result.record?.product_categories?.[0]?.category_id || "";
      const selectedCategoryMeta = (result.references?.categories || []).find((item: any) => item.id === selectedCategory);
      setEditorFamilyId(selectedCategoryMeta?.catalog_family_id || "");
      setEditorCategoryId(selectedCategoryMeta?.catalog_filter_id || selectedCategory);
      setIssueUpdates((result.qualityIssues || []).map((issue: any) => ({ id: issue.id, status: "", resolutionNote: "" })));
    }).catch(() => active && setMessage("تعذر فتح السجل للتدقيق."));
    return () => { active = false; };
  }, [entity, id]);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (data?.record?.status === "published" && !window.confirm("هذا السجل منشور حالياً، وأي تعديل سيظهر مباشرةً للمستخدمين بعد الحفظ. هل تريد المتابعة؟")) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries());
    setWorking(true);
    setMessage("");
    const response = await fetch("/api/admin/records", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ entity, id, fields, attributes, issueUpdates: issueUpdates.filter((issue) => issue.status), contractRevision: data?.recordContractRevision || "" }) });
    const result = await response.json();
    setWorking(false);
    if (!response.ok) { setMessage(result.reason === "contract_revision_stale" || result.reason === "contract_revision_required" ? "تغيّر عقد التصنيف منذ فتح السجل. أغلق المحرر وافتحه مجدداً قبل الحفظ." : ["invalid_attribute", "invalid_attribute_value", "duplicate_attribute"].includes(result.reason) ? "إحدى قيم المواصفات غير معتمدة. اختر القيم من القوائم الظاهرة." : result.reason === "upstream_error" ? "تعذر حفظ السجل في قاعدة البيانات. لم تُحذف المواصفات السابقة؛ أعد المحاولة، وإذا تكرر الخطأ سجل الوقت الظاهر." : "تعذر الحفظ. تحقق من القيم المنظمة وروابط المصدر."); return; }
    setData((current: any) => ({ ...current, ...result }));
    await onSaved();
    onClose();
  };
  const addMedia = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const originalFile = form.get("file");
    if (!(originalFile instanceof File) || !originalFile.size) { setMessage("اختر ملف صورة أولاً."); return; }
    if (!allowedMediaExtension(originalFile.name)) { setMessage(mediaErrorMessage("unsupported_type")); return; }
    const altAr = String(form.get("altAr") || "").trim();
    const rightsNote = String(form.get("rightsNote") || "").trim();
    if (altAr.length < 2) { setMessage(mediaErrorMessage("alt_required")); return; }
    if (rightsNote.length < 3) { setMessage(mediaErrorMessage("rights_required")); return; }
    let file = originalFile;
    let optimized = false;
    try { const prepared = await prepareCatalogImage(originalFile); file = prepared.file; optimized = prepared.optimized; } catch { setMessage(mediaErrorMessage("file_too_large", originalFile.size)); return; }
    setMediaWorking("upload"); setMessage("");
    let response: Response;
    try {
      response = await uploadCatalogMedia(entity, id, file, altAr, rightsNote);
    } catch (error) {
      setMediaWorking("");
      setMessage(mediaErrorMessage(error instanceof DOMException && error.name === "AbortError" ? "upload_timeout" : undefined));
      return;
    }
    const result = await response.json().catch(() => ({})); setMediaWorking("");
    if (!response.ok) { setMessage(mediaErrorMessage(response.status === 413 ? "request_too_large" : result.reason, file.size)); return; }
    setData((current: any) => ({ ...current, media: [...(current.media || []), result.media] }));
    formElement.reset(); setMediaFileInfo(""); setMediaAltText(""); setMediaRightsText(""); setMessage(`تم رفع الصورة وربطها بالسجل${optimized ? " بعد تحسين حجمها تلقائياً" : ""}. ظهرت الآن في قائمة صور السجل وستظهر للعامة إذا كان السجل منشوراً.`);
  };
  const deleteMedia = async (mediaId: string) => {
    if (!window.confirm("سيُحذف ملف الصورة وربطه من السجل. هل تريد المتابعة؟")) return;
    setMediaWorking(mediaId); setMessage("");
    const response = await fetch("/api/admin/media", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: mediaId }) });
    setMediaWorking("");
    if (!response.ok) { setMessage("تعذر حذف الصورة."); return; }
    setData((current: any) => ({ ...current, media: (current.media || []).filter((item: any) => item.id !== mediaId) }));
    setMessage("حُذفت الصورة من السجل ومخزن الملفات.");
  };
  const restoreRevision = async (eventId: string) => {
    if (!window.confirm("سيُعاد محتوى الحقول الأساسية إلى النسخة السابقة، مع الاحتفاظ بسجل كامل للعملية. العلاقات والصور لا تُحذف. هل تريد المتابعة؟")) return;
    setWorking(true); setMessage("جارٍ استعادة النسخة السابقة…");
    const response = await fetch("/api/admin/records", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "restore_revision", entity, id, eventId }) });
    const result = await response.json(); setWorking(false);
    if (!response.ok) { setMessage(result.reason === "revision_has_no_snapshot" ? "هذه العملية القديمة لا تحتوي نسخة قابلة للاستعادة." : "تعذر استعادة النسخة. تحتاج صلاحية مراجع أو مدير."); return; }
    setData(result); setRevisionKey((value) => value + 1); setMessage("تمت استعادة الحقول الأساسية وتسجيل نسخة جديدة في السجل."); await onSaved();
  };
  const record = data?.record || {};
  const firstLocation = record.locations?.[0] || {};
  const primaryCategory = record.product_categories?.find((item: any) => item.is_primary) || record.product_categories?.[0] || {};
  const references = data?.references || {};
  const editorEquipmentRoot = (references.categories || []).find((category: any) => category.code === "EQP");
  const editorFamilies = (references.categories || []).filter((category: any) => category.is_navigation_visible && category.navigation_parent_id === editorEquipmentRoot?.id);
  const matchingCategories = record.product_kind === "roasted_coffee"
    ? (references.categories || []).filter((category: any) => category.code === "COF-ROASTED")
    : (references.categories || []).filter((category: any) => category.is_navigation_visible && category.navigation_parent_id === editorFamilyId);
  const matchingBrands = (references.brands || []).filter((brand: any) => !brand.product_kinds?.length || brand.product_kinds.includes(record.product_kind));
  const displayedProductFields = ((references.filterDefinitions || data?.fieldDefinitions || []) as any[]).filter((field:any)=>!editorCategoryId || !field.category_id || field.category_id===editorCategoryId).sort((a:any,b:any)=>(a.sort_order||0)-(b.sort_order||0));
  const entityPresentation: Record<string, { title: string; note: string; className: string }> = {
    products: { title: "بطاقة المنتج الرئيسية", note: "هوية ومواصفات مشتركة بين جميع البائعين؛ لا يوضع السعر هنا.", className: "master-product-context" },
    offers: { title: "عرض بائع مرتبط بمنتج", note: "السعر والتوفر وصور هذا البائع فقط؛ لا ينشئ منتجاً جديداً.", className: "seller-offer-context" },
    organizations: { title: "سجل جهة أو بائع", note: "هوية الجهة وفروعها وأدوارها داخل الدليل.", className: "organization-context" },
    brands: { title: "سجل علامة تجارية", note: "تحدد عائلة المنتجات التي يجوز ربطها بهذه العلامة.", className: "brand-context" },
    contents: { title: "محتوى تعليمي", note: "مقال أو دليل أو درس مستقل عن المنتجات التجارية.", className: "content-context" },
    origin_claims: { title: "مصدر قهوة", note: "ادعاء منشأ مرتبط بمنتج قهوة محدد ومصدر موثق.", className: "origin-context" },
  };
  const editorContext = entityPresentation[entity] || { title: "سجل بيانات", note: "راجع نوع السجل قبل التعديل.", className: "generic-context" };
  return (
    <div className="record-editor-backdrop" role="dialog" aria-modal="true" aria-label="فتح وتدقيق السجل">
      <section className="record-editor">
        <div className="section-head"><div><span className="eyebrow">مراجعة تفصيلية</span><h2>{editorContext.title}</h2></div><button type="button" onClick={onClose}>إغلاق</button></div>
        <div className={`entity-context-banner ${editorContext.className}`}><div><b>{editorContext.title}</b><span>{editorContext.note}</span></div><div><b>{entity === "offers" ? record.products?.name_ar || "عرض" : record.name_ar || record.title_ar || "السجل"}</b>{entity === "offers" && <span>البائع: {record.organizations?.name_ar || "غير محدد"}</span>}</div></div>
        {!data && !message && <p role="status">جارٍ تحميل جميع الحقول والمصادر…</p>}
        {message && <p className="admin-message" role="status">{message}</p>}
        {data && <form key={revisionKey} className="record-edit-form" onSubmit={save}>
          <div className="record-status-line"><b>الحالة الحالية: {record.status || "مرتبط بالمنتج"}</b><span>المعرف: {id}</span></div>
          {entity === "organizations" && <>
            <label>الاسم العربي<input name="name_ar" defaultValue={record.name_ar || ""} required /></label><label>الاسم الإنجليزي<input name="name_en" defaultValue={record.name_en || ""} /></label>
            <label>الموقع الإلكتروني<input name="website_url" type="url" defaultValue={record.website_url || ""} /></label><label>الهاتف<input name="phone" defaultValue={record.phone || ""} /></label><label>البريد<input name="email" type="email" defaultValue={record.email || ""} /></label>
            <label>المنطقة<input name="district_ar" defaultValue={firstLocation.district_ar || ""} /></label><label className="wide">العنوان<input name="address_ar" defaultValue={firstLocation.address_ar || ""} required /></label><label className="wide">الوصف<textarea name="description_ar" rows={4} defaultValue={record.description_ar || ""} /></label>
          </>}
          {entity === "brands" && <>
            <label>اسم العلامة بالعربية<input name="name_ar" defaultValue={record.name_ar || ""} required /></label><label>الاسم الإنجليزي<input name="name_en" defaultValue={record.name_en || ""} /></label>
            <label>عائلة العلامة<select name="product_kind" defaultValue={record.brand_product_kinds?.[0]?.product_kind || ""} required><option value="">اختر</option><option value="roasted_coffee">قهوة محمصة</option><option value="equipment">معدات</option><option value="consumable">مستهلكات</option><option value="care_product">عناية وصيانة</option><option value="replacement_part">قطع غيار</option></select></label>
            <label>المصنّع أو الجهة المالكة<select name="manufacturer_organization_id" defaultValue={record.manufacturer_organization_id || ""}><option value="">غير محددة</option>{(references.organizations || []).map((organization: any) => <option key={organization.id} value={organization.id}>{organization.name_ar}</option>)}</select></label><label className="wide">الموقع الرسمي<input name="website_url" type="url" defaultValue={record.website_url || ""} /></label>
          </>}
          {entity === "products" && <>
            <label>الاسم العربي<input name="name_ar" defaultValue={record.name_ar || ""} required /></label><label>الاسم الإنجليزي<input name="name_en" defaultValue={record.name_en || ""} /></label>
            <label>نوع المنتج<input value={record.product_kind === "roasted_coffee" ? "قهوة محمصة" : record.product_kind === "equipment" ? "معدات" : record.product_kind} readOnly /></label>
            {record.product_kind !== "roasted_coffee" && <label>العائلة الرئيسية للمعدات<select value={editorFamilyId} onChange={(event)=>{setEditorFamilyId(event.target.value);setEditorCategoryId("");setAttributes([]);}} required><option value="">اختر إحدى العوائل الخمس</option>{editorFamilies.map((category:any)=><option key={category.id} value={category.id}>{category.name_ar}</option>)}</select></label>}
            <label>التصنيف الفرعي<select name="category_id" value={editorCategoryId || primaryCategory.category_id || ""} disabled={record.product_kind !== "roasted_coffee" && !editorFamilyId} onChange={(event)=>{const next=event.target.value;setEditorCategoryId(next);const fields=(references.filterDefinitions||[]).filter((field:any)=>field.category_id===next);setAttributes((current)=>fields.map((field:any)=>current.find((item)=>item.fieldId===field.id)||{fieldId:field.id,value:""}));}} required><option value="">{editorFamilyId || record.product_kind === "roasted_coffee" ? "اختر التصنيف الفرعي" : "اختر العائلة أولاً"}</option>{matchingCategories.map((category: any) => <option key={category.id} value={category.id}>{category.name_ar}</option>)}</select></label>
            <label>العلامة<select name="brand_id" defaultValue={record.brand_id || ""}><option value="">غير محددة</option>{matchingBrands.map((brand: any) => <option key={brand.id} value={brand.id}>{brand.name_ar}</option>)}</select></label>
            <label>الجهة المنتجة أو المحمصة<select name="owner_organization_id" defaultValue={record.owner_organization_id || ""} required={record.product_kind === "roasted_coffee"}><option value="">غير محددة</option>{(references.organizations || []).map((organization: any) => <option key={organization.id} value={organization.id}>{organization.name_ar} · {(organization.organization_roles || []).map((role: any) => organizationRoleLabels[role.role_type] || role.role_type).join("، ")}</option>)}</select><small>اختر صاحب المنتج/المحمصة هنا. البائع وسعره يربطان من «عرض وسعر» ولا يوضعان في هذا الحقل.</small></label><label>الموديل<input name="model_number" defaultValue={record.model_number || ""} /></label>
            <label className="wide">الملخص<textarea name="summary_ar" rows={3} defaultValue={record.summary_ar || ""} /></label><label className="wide">الوصف<textarea name="description_ar" rows={5} defaultValue={record.description_ar || ""} /></label>
            <fieldset className="attribute-editor wide"><legend>المواصفات الخاصة بهذه الفئة</legend><p>تظهر هنا فقط مواصفات الفئة المختارة. الحقول الموسومة «مطلوبة للنشر» يجب إكمالها، والباقي اختياري حسب المصدر. السعر والتوفر لا يظهران هنا لأنهما تابعان للبائع.</p>{displayedProductFields.map((field: any) => { const index = attributes.findIndex((attribute) => attribute.fieldId === field.id); const value = index >= 0 ? attributes[index].value : ""; const update = (next: string) => setAttributes((current) => current.map((item) => item.fieldId === field.id ? { ...item, value: next } : item)); return <label key={field.id}><span>{field.name_ar}{field.is_required_for_publish ? " — مطلوبة للنشر" : " — اختيارية"}</span>{field.data_type === "enum" ? <select value={value} onChange={(event) => update(event.target.value)}><option value="">غير محدد</option>{(field.allowed_values || []).map((option: string) => <option value={option} key={option}>{attributeValueLabels[option] || option}</option>)}</select> : field.data_type === "multi_enum" && field.allowed_values?.length ? <MultiChoiceField value={value} options={field.allowed_values} onChange={update} /> : field.data_type === "reference" && field.code === "roaster_org_id" ? <select value={value.split(",")[0] || ""} onChange={(event) => update(event.target.value)}><option value="">غير محدد</option>{(references.organizations || []).map((organization: any) => <option key={organization.id} value={organization.id}>{organization.name_ar}</option>)}</select> : field.data_type === "boolean" ? <select value={value} onChange={(event) => update(event.target.value)}><option value="">غير محدد</option><option value="true">نعم</option><option value="false">لا</option></select> : <input type={["integer", "decimal"].includes(field.data_type) ? "number" : field.data_type === "date" ? "date" : "text"} value={value} onChange={(event) => update(event.target.value)} placeholder={field.unit_code || "أدخل القيمة الموثقة"} />}</label>; })}</fieldset>
          </>}
          {entity === "offers" && <><div className="read-only-pair"><span>المنتج</span><b>{record.products?.name_ar}</b></div><div className="read-only-pair"><span>البائع</span><b>{record.organizations?.name_ar}</b></div><label>السعر<input name="price" type="number" min="0" step="0.001" defaultValue={record.price ?? ""} required /></label><label>العملة<input name="currency_code" value="IQD" readOnly /></label><label>التوفر<select name="availability" defaultValue={record.availability || "unknown"}><option value="in_stock">متوفر</option><option value="out_of_stock">غير متوفر</option><option value="preorder">طلب مسبق</option><option value="unknown">غير متحقق</option></select></label><label>تاريخ الرصد<input name="observed_at" type="datetime-local" defaultValue={String(record.observed_at || "").slice(0, 16)} /></label><label className="wide">رابط توثيق العرض<input name="external_url" type="url" defaultValue={record.external_url || ""} required /><small>دليل داخلي للإدارة؛ المستخدم ينتقل إلى صفحة البائع داخل المنصة.</small></label></>}
          {entity === "contents" && <><label>العنوان العربي<input name="title_ar" defaultValue={record.title_ar || ""} required /></label><label>العنوان الإنجليزي<input name="title_en" defaultValue={record.title_en || ""} /></label><label className="wide">المقتطف<textarea name="excerpt_ar" rows={2} defaultValue={record.excerpt_ar || ""} /></label><label className="wide">النص العربي<textarea name="body_ar" rows={12} minLength={20} defaultValue={record.body_ar || ""} required /></label></>}
          {entity === "origin_claims" && <><div className="read-only-pair"><span>منتج القهوة</span><b>{record.products?.name_ar}</b></div><div className="read-only-pair"><span>الدولة والمنطقة</span><b>{record.countries?.name_ar} · {record.coffee_regions?.name_ar || "غير محددة"}</b></div><label>المزرعة أو المنتج<input name="farm_or_producer_name" defaultValue={record.farm_or_producer_name || ""} /></label><label>مرجع الدفعة<input name="lot_reference" defaultValue={record.lot_reference || ""} /></label><label>المعالجة<input name="process_code" defaultValue={record.process_code || ""} /></label><label>السلالات<input name="variety_codes" defaultValue={(record.variety_codes || []).join("، ")} /></label><label>الموسم<input name="harvest_label" defaultValue={record.harvest_label || ""} /></label></>}
          <fieldset className="entity-media-manager wide"><legend>{entity === "offers" ? "صور عرض البائع" : entity === "products" ? "صور بطاقة المنتج الرئيسية" : "صور السجل"}</legend><div className="entity-media-grid">{(data.media || []).map((media: any) => <article key={media.id}><img src={media.url} alt={media.alt_ar} /><div><b>{media.alt_ar}</b><span>{media.rights_note}</span>{media.is_primary && <small>الصورة الرئيسية</small>}</div><button type="button" className="danger-action" disabled={mediaWorking === media.id} onClick={() => deleteMedia(media.id)}>حذف الصورة</button></article>)}{!(data.media || []).length && <p>لا توجد صورة مرتبطة بهذا السجل.</p>}</div><div className="media-upload-note">{entity === "offers" ? "هذه الصور تظهر في صفحة هذا البائع وعرضه فقط، ولا تستبدل صور المنتج الرئيسية." : "يمكن إضافة أكثر من صورة؛ أول صورة تصبح رئيسية تلقائياً. الصورة تحتاج وصفاً بديلاً وبيان حقوق واضح."}</div></fieldset>
          <fieldset className="source-review wide"><legend>المصادر المحفوظة</legend>{data.sources?.length ? data.sources.map((link: any) => <article key={link.id}><b>{link.source_records?.title}</b><span>{link.source_records?.source_type} · {link.source_records?.publisher} · {link.source_records?.accessed_at}</span>{link.source_records?.url && <a href={link.source_records.url} target="_blank" rel="noreferrer">فتح المصدر</a>}<p>{link.source_records?.evidence_excerpt || "لا توجد ملاحظة دليل."}</p></article>) : <p className="danger-text">لا يوجد مصدر مرتبط؛ لن يكون السجل جاهزاً للنشر.</p>}</fieldset>
          {data.qualityIssues?.length > 0 && <fieldset className="quality-issue-editor wide"><legend>ملاحظات الجودة المانعة</legend><p>بصلاحية المدير يمكنك توثيق قرار كل ملاحظة، وبعد الحفظ تزول من موانع النشر.</p>{data.qualityIssues.map((issue: any) => { const update = issueUpdates.find((item) => item.id === issue.id); return <article key={issue.id}><b>{issue.severity} · {issue.message_ar}</b><select value={update?.status || ""} onChange={(event) => setIssueUpdates((current) => current.map((item) => item.id === issue.id ? { ...item, status: event.target.value } : item))}><option value="">تبقى مفتوحة</option><option value="fixed">تم التصحيح</option><option value="accepted">مقبولة بقرار إداري</option><option value="dismissed">مرفوضة كتنبيه غير منطبق</option></select><input value={update?.resolutionNote || ""} onChange={(event) => setIssueUpdates((current) => current.map((item) => item.id === issue.id ? { ...item, resolutionNote: event.target.value } : item))} placeholder="سبب القرار أو ما تم تصحيحه" /></article>; })}</fieldset>}
          <button className="primary" type="submit" disabled={working}>{working ? "جارٍ الحفظ…" : "حفظ والعودة إلى الطابور"}</button>
        </form>}
        {data?.history?.length > 0 && <details className="record-revision-history"><summary><b>سجل التغييرات والنسخ السابقة</b><span>{data.history.length} عملية</span></summary><p>الاستعادة تعيد الحقول الأساسية فقط؛ الصور والعلاقات تبقى محفوظة لتجنب فقدان البيانات.</p>{data.history.map((event: any) => <article key={event.id}><div><b>{event.action}</b><span>{new Date(event.created_at).toLocaleString("ar-IQ")}</span></div>{canRestore && event.before_data && <button type="button" disabled={working} onClick={() => restoreRevision(event.id)}>استعادة هذه النسخة</button>}</article>)}</details>}
        {data && <form className="entity-media-upload" onSubmit={addMedia} noValidate><h3>إضافة صورة جديدة</h3><p className="wide media-upload-note">نفّذ الخطوات الثلاث أدناه ثم اضغط زر الرفع. لن يمنع المتصفح الإرسال بصمت؛ إذا نقص حقل ستظهر رسالة عربية واضحة أعلى النافذة.</p><div className="media-readiness wide"><span className={mediaFileInfo ? "done" : ""}>1. اختيار الصورة {mediaFileInfo ? "✓" : ""}</span><span className={mediaAltText.trim().length >= 2 ? "done" : ""}>2. الوصف البديل {mediaAltText.trim().length >= 2 ? "✓" : ""}</span><span className={mediaRightsText.trim().length >= 3 ? "done" : ""}>3. المصدر والحقوق {mediaRightsText.trim().length >= 3 ? "✓" : ""}</span></div><label>1. ملف الصورة<input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif" onChange={(event) => { const file = event.currentTarget.files?.[0]; setMediaFileInfo(file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)}MB` : ""); }} />{mediaFileInfo && <small className="ready-text">تم اختيار: {mediaFileInfo}{Number(mediaFileInfo.match(/([\d.]+)MB/)?.[1] || 0) > 1 ? " · سيُحسّن الحجم تلقائياً" : ""}</small>}</label><label>2. الوصف البديل<input name="altAr" maxLength={300} value={mediaAltText} onChange={(event) => setMediaAltText(event.target.value)} placeholder="مثال: مطحنة DF54 V4 سوداء من الأمام" /><small>صف ما يظهر في الصورة للمستخدم الذي لا يستطيع رؤيتها.</small></label><label>3. حقوق الصورة ومصدرها<input name="rightsNote" maxLength={1000} value={mediaRightsText} onChange={(event) => setMediaRightsText(event.target.value)} placeholder="مثال: صورة رسمية من موقع الشركة المصنّعة" /><small>اكتب صاحب الصورة أو رابط/جهة الحصول عليها وسبب السماح باستخدامها.</small></label><button type="submit" disabled={mediaWorking === "upload"}>{mediaWorking === "upload" ? "جارٍ الرفع والربط…" : "رفع الصورة وربطها الآن"}</button></form>}
      </section>
    </div>
  );
}

function SupportWorkspace({ data, canDelete, onUpdated }: { data: any; canDelete: boolean; onUpdated: (result: any) => void }) {
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [view, setView] = useState<"open" | "closed" | "archived" | "all">("open");
  const filtered = data.requests.filter((request: any) => view === "all" || (view === "archived" ? request.status === "archived" : view === "closed" ? ["resolved", "closed", "spam"].includes(request.status) : !["resolved", "closed", "spam", "archived"].includes(request.status)));
  const selected = filtered.find((request: any) => request.id === selectedId) || filtered[0];
  if (!data.requests.length) return <section className="support-workspace"><h2>معالجة طلبات المساعدة</h2><p>لا توجد طلبات حالياً.</p></section>;
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = new FormData(event.currentTarget); setMessage("جارٍ حفظ المعالجة…");
    const response = await fetch("/api/admin/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "update_support_request", id: selected.id, status: form.get("status"), priority: form.get("priority"), assignedTo: form.get("assignedTo"), internalNotes: form.get("internalNotes"), resolutionNote: form.get("resolutionNote"), technicalReference: form.get("technicalReference") }) });
    const result = await response.json(); if (!response.ok) { setMessage("تعذر حفظ المعالجة."); return; } onUpdated(result); setMessage("حُفظت المعالجة وسجل القرار.");
  };
  const workflowAction = async (action: "mark_support_escalated" | "mark_support_reply" | "delete_support_request", openUrl?: string) => {
    if (action === "delete_support_request" && !window.confirm("سيُحذف الطلب المؤرشف نهائياً مع بيانات التواصل. هل أنت متأكد؟")) return;
    setMessage("جارٍ تسجيل العملية…");
    const response = await fetch("/api/admin/review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,id:selected.id})});
    const result = await response.json().catch(()=>({}));
    if(!response.ok){setMessage(result.reason === "contact_or_resolution_missing" ? "احفظ نتيجة الحل وتأكد من وجود رقم واتساب أولاً." : "تعذر تنفيذ العملية.");return;}
    onUpdated(result); setMessage(action === "mark_support_escalated" ? "سُجلت إحالة الطلب إلى الدعم الفني." : action === "mark_support_reply" ? "سُجل فتح الرد الموجّه إلى المستخدم." : "حُذف الطلب المؤرشف نهائياً.");
    if(openUrl) window.open(openUrl,"_blank","noopener,noreferrer");
  };
  const archiveSelected = async () => {
    setMessage("جارٍ نقل الطلب إلى الأرشيف…");
    const response = await fetch("/api/admin/review",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"update_support_request",id:selected.id,status:"archived",priority:selected.priority || "normal",assignedTo:selected.assigned_to,internalNotes:selected.internal_notes,resolutionNote:selected.resolution_note,technicalReference:selected.technical_reference})});
    const result = await response.json().catch(()=>({}));
    if(!response.ok){setMessage("تعذرت أرشفة الطلب.");return;} onUpdated(result);setSelectedId("");setView("archived");setMessage("نُقل الطلب إلى أرشيف طلبات المساعدة.");
  };
  return <section className="support-workspace" id="operations-support">
    <div className="section-head"><div><span className="eyebrow">Support Desk</span><h2>معالجة طلبات المساعدة</h2></div><span>من الاستلام إلى الإغلاق</span></div>
    <p>هذا مكتب معالجة فعلي داخل المنصة. التقرير الأصلي محفوظ أدناه، وكل تغيير في المسؤول أو الحالة أو الحل يُحفظ في قاعدة البيانات وسجل التدقيق. الربط بأداة فنية خارجية اختياري لاحقاً عبر «المرجع الفني».</p>
    <div className="support-tabs"><button type="button" className={view === "open" ? "active" : ""} onClick={() => { setView("open"); setSelectedId(""); }}>المفتوحة</button><button type="button" className={view === "closed" ? "active" : ""} onClick={() => { setView("closed"); setSelectedId(""); }}>المحلولة والمغلقة</button><button type="button" className={view === "archived" ? "active" : ""} onClick={() => { setView("archived"); setSelectedId(""); }}>الأرشيف</button><button type="button" className={view === "all" ? "active" : ""} onClick={() => { setView("all"); setSelectedId(""); }}>الكل</button></div>
    {message && <p className="admin-message" role="status">{message}</p>}
    <div className="support-layout">
      <nav>{filtered.map((request: any) => <button type="button" className={request.id === selected?.id ? "active" : ""} key={request.id} onClick={() => setSelectedId(request.id)}><b>{request.subject}</b><span>{request.public_reference} · {request.status} · {request.priority}</span></button>)}{!filtered.length && <p>لا توجد طلبات في هذا التبويب.</p>}</nav>
      {selected && <form key={selected.id} onSubmit={save}>
        <section className="support-original-report"><h3>التقرير الأصلي المحفوظ</h3><dl><div><dt>المرجع</dt><dd>{selected.public_reference}</dd></div><div><dt>تاريخ الاستلام</dt><dd>{new Date(selected.created_at).toLocaleString("ar-IQ")}</dd></div><div><dt>نوع الطلب</dt><dd>{selected.request_type}</dd></div><div><dt>الصفحة</dt><dd>{selected.page_path}</dd></div><div><dt>قناة التواصل</dt><dd>{selected.preferred_channel}</dd></div><div><dt>المستخدم</dt><dd>{selected.requester_name || "غير مسجل"}</dd></div><div><dt>واتساب</dt><dd>{selected.requester_phone || "غير مسجل"}</dd></div><div><dt>البريد</dt><dd>{selected.requester_email || "غير مسجل"}</dd></div></dl><h4>{selected.subject}</h4><p>{selected.message}</p></section>
        <label>الحالة<select name="status" defaultValue={selected.status}><option value="new">جديد</option><option value="triaged">مصنف</option><option value="in_progress">قيد المعالجة</option><option value="waiting_user">بانتظار المستخدم</option><option value="resolved">تم الحل</option><option value="closed">مغلق</option><option value="spam">مزعج</option><option value="archived">مؤرشف</option></select></label>
        <label>الأولوية<select name="priority" defaultValue={selected.priority || "normal"}><option value="low">منخفضة</option><option value="normal">عادية</option><option value="high">عالية</option><option value="urgent">عاجلة</option></select></label>
        <label>المسؤول<select name="assignedTo" defaultValue={selected.assigned_to || ""}><option value="">غير معيّن</option>{data.staff.map((profile: any) => <option key={profile.id} value={profile.id}>{profile.display_name || profile.role}</option>)}</select></label>
        <label>مرجع فني<input name="technicalReference" defaultValue={selected.technical_reference || ""} placeholder="رقم مشكلة أو رابط مهمة فنية" /></label>
        <label className="wide">ملاحظات داخلية<textarea name="internalNotes" rows={5} defaultValue={selected.internal_notes || ""} /></label><label className="wide">نتيجة الحل<textarea name="resolutionNote" rows={4} defaultValue={selected.resolution_note || ""} /></label>
        {selected.history?.length > 0 && <details className="support-history wide"><summary>سجل المعالجة ({selected.history.length})</summary>{selected.history.map((event: any, index: number) => <p key={`${event.created_at}-${index}`}><b>{new Date(event.created_at).toLocaleString("ar-IQ")}</b> · {event.action}</p>)}</details>}
        <button className="primary" type="submit">حفظ المعالجة</button>
        <div className="support-handoff wide"><b>التصنيف والإحالة ثم الرد</b><p>احفظ نوع المشكلة والملاحظات الداخلية أولاً، ثم أحِلها إلى فريق الدعم بالبريد. بعد اكتمال الحل احفظ «نتيجة الحل» وافتح الرد الجاهز إلى المستخدم عبر واتساب.</p><div className="queue-actions"><button type="button" onClick={()=>workflowAction("mark_support_escalated",`mailto:?subject=${encodeURIComponent(`إحالة دعم ${selected.public_reference}: ${selected.subject}`)}&body=${encodeURIComponent(`المرجع: ${selected.public_reference}\nالنوع: ${selected.request_type}\nالصفحة: ${selected.page_path}\nالتقرير: ${selected.message}\nالملاحظات الداخلية: ${selected.internal_notes || "—"}\nالمرجع الفني: ${selected.technical_reference || "—"}`)}`)}>إحالة بالبريد إلى فريق الدعم</button><button type="button" disabled={!selected.requester_phone || !selected.resolution_note} onClick={()=>workflowAction("mark_support_reply",`https://wa.me/${String(selected.requester_phone || "").replace(/\D/g,"")}?text=${encodeURIComponent(`مرحباً ${selected.requester_name || ""}، تمت معالجة طلبك في منصة قهوتنا.\nالمرجع: ${selected.public_reference}\nالنتيجة: ${selected.resolution_note || ""}`)}`)}>إرسال نتيجة الحل عبر واتساب</button>{["resolved","closed"].includes(selected.status) && <button type="button" onClick={archiveSelected}>أرشفة بعد الحل</button>}{canDelete && selected.status === "archived" && <button type="button" className="danger-action" onClick={()=>workflowAction("delete_support_request")}>مسح الطلب نهائياً</button>}</div><small>{selected.escalated_at ? `آخر إحالة مسجلة: ${new Date(selected.escalated_at).toLocaleString("ar-IQ")}` : "لم تسجل إحالة بعد"} · {selected.customer_replied_at ? `آخر رد مسجل: ${new Date(selected.customer_replied_at).toLocaleString("ar-IQ")}` : "لم يسجل رد للمستخدم بعد"}</small></div>
      </form>}
    </div>
  </section>;
}

function ArchivedImportBatches() {
  const [batches, setBatches] = useState<DataCenterBatch[]>([]);
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState("");
  const load = async () => {
    const response = await fetch("/api/admin/data-center", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage("تعذر تحميل دفعات الاستيراد المؤرشفة."); return; }
    setBatches((result.batches || []).filter((batch: DataCenterBatch) => batch.status === "archived"));
  };
  useEffect(() => { const handle = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(handle); }, []);
  const act = async (batch: DataCenterBatch, action: "restore_batch" | "delete_archived_batch") => {
    if (action === "delete_archived_batch") {
      const confirmation = window.prompt(`سيُحذف سجل الدفعة وصفوفه الخام نهائياً، ولن تُحذف الجهات الناتجة عنه. اكتب رمز الدفعة للتأكيد:\n${batch.batch_code}`);
      if (confirmation?.trim() !== batch.batch_code) return;
    }
    setWorking(batch.id); setMessage("");
    const response = await fetch("/api/admin/data-center", { method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({ action,batchId:batch.id }) });
    const result = await response.json().catch(() => ({})); setWorking("");
    if (!response.ok) { setMessage("تعذر تنفيذ العملية على الدفعة."); return; }
    setMessage(action === "restore_batch" ? "أعيدت الدفعة إلى سجل الدفعات النشطة." : `حُذفت الدفعة و${Number(result.deletedRows || 0).toLocaleString("ar-IQ")} من صفوفها الخام.`);
    await load();
  };
  return <section className="inactive-catalog archived-batches"><div className="section-head"><div><span className="eyebrow">Import Archive</span><h2>دفعات الجهات المشاركة المؤرشفة</h2></div><span>{batches.length} دفعة</span></div>{message && <p className="admin-message" role="status">{message}</p>}<div>{batches.map((batch)=><article key={batch.id}><div><b>{batch.source_label}</b><span>{batch.batch_code} · {batch.total_rows} سجل · {new Date(batch.created_at).toLocaleDateString("ar-IQ")}</span></div><div className="queue-actions"><button type="button" disabled={working===batch.id} onClick={()=>act(batch,"restore_batch")}>استعادة إلى سجل الدفعات</button><button type="button" className="danger-action" disabled={working===batch.id} onClick={()=>act(batch,"delete_archived_batch")}>مسح نهائي</button></div></article>)}{!batches.length && <p>لا توجد دفعات استيراد مؤرشفة.</p>}</div></section>;
}

function SearchTermEditForm({ term, onCancel, onSaved }: { term: any; onCancel: () => void; onSaved: (result: any) => void }) {
  const [message, setMessage] = useState("");
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (term.status === "active" && !window.confirm("سيؤثر هذا التعديل فوراً في نتائج البحث. هل راجعت المصطلح والمرادفات والنطاق؟")) return;
    const form = new FormData(event.currentTarget); setMessage("جارٍ الحفظ…");
    const response = await fetch("/api/admin/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "update_search_term", id: term.id, canonicalTermAr: form.get("canonicalTermAr"), canonicalTermEn: form.get("canonicalTermEn"), aliases: String(form.get("aliases") || "").split(/[،,]/).map((value) => value.trim()).filter(Boolean), intent: form.get("intent"), entityScope: form.getAll("entityScope"), matchMode: form.get("matchMode"), weight: Number(form.get("weight")), sourceBasis: form.get("sourceBasis") }) });
    const result = await response.json(); if (!response.ok) { setMessage("تعذر حفظ التعديل؛ تحقق من عدم تكرار المصطلح والحقول المطلوبة."); return; } onSaved(result);
  };
  return <form className="search-term-form editing" onSubmit={save}>{message && <p className="admin-message wide">{message}</p>}<label>المصطلح العربي<input name="canonicalTermAr" defaultValue={term.canonical_term_ar} required /></label><label>الإنجليزي<input name="canonicalTermEn" defaultValue={term.canonical_term_en || ""} /></label><label className="wide">المرادفات<input name="aliases" defaultValue={term.aliases.join("، ")} /></label><label>المقصد<select name="intent" defaultValue={term.intent}><option value="broad">بحث عام</option><option value="product">منتج</option><option value="organization">جهة</option><option value="origin">مصدر قهوة</option><option value="content">معرفة</option></select></label><label>طريقة المطابقة<select name="matchMode" defaultValue={term.match_mode}><option value="exact">تطابق تام</option><option value="prefix">بداية الكلمة</option><option value="contains">يحتوي</option></select></label><label>درجة الأولوية (1–100)<input name="weight" type="number" min="1" max="100" defaultValue={term.weight} /><small>درجة ترتيب وليست وزناً بالغم.</small></label><label>أساس المصدر<select name="sourceBasis" defaultValue={term.source_basis}><option value="observed_query">ظهر في بحث المستخدمين</option><option value="platform_decision">قرار تحريري للمنصة</option><option value="industry_reference">مرجع معتمد في القطاع</option></select></label><fieldset className="search-scope wide"><legend>نطاق النتائج</legend>{[["product", "المنتجات"], ["organization", "الجهات"], ["content", "المعرفة"], ["origin", "المصادر"]].map(([value, label]) => <label key={value}><input type="checkbox" name="entityScope" value={value} defaultChecked={term.entity_scope.includes(value)} /> {label}</label>)}</fieldset><div className="queue-actions wide"><button type="submit">حفظ التعديل</button><button type="button" onClick={onCancel}>إلغاء</button></div></form>;
}

type MediaLibraryRow = { scope: "master" | "participant"; entity: "products" | "offers" | "organizations"; id: string; label: string; status: string; productKind: string; organizationId: string | null; organizationName: string | null; organizationRole: string | null; organizationRoles?: string[]; mediaCount: number; categoryId: string | null; categoryPathIds: string[]; categoryCode: string | null; categoryName: string | null; coffeeForm: string | null };
type MediaTaxonomy = { id: string; code: string; name_ar: string; name_en: string; parent_id: string | null; navigation_parent_id: string | null; is_navigation_visible: boolean; catalog_family_id: string | null; catalog_filter_id: string | null; catalog_product_kind: string | null; sort_order: number; status: string };
function MediaLibrary({ onOpen, onUnauthorized }: { onOpen: (record: { entity: string; id: string }) => void; onUnauthorized: () => void }) {
  const [rows, setRows] = useState<MediaLibraryRow[]>([]);
  const [taxonomy, setTaxonomy] = useState<MediaTaxonomy[]>([]);
  const [suspicious, setSuspicious] = useState<Array<{ id: string; entity: string; entityId: string; label: string; altAr: string; reason: string }>>([]);
  const [scope, setScope] = useState<"master" | "participant">("master");
  const [participantRecord, setParticipantRecord] = useState<"offers" | "organizations">("offers");
  const [role, setRole] = useState("all");
  const [organizationId, setOrganizationId] = useState("all");
  const [rootCategoryId, setRootCategoryId] = useState("all");
  const [familyCategoryId, setFamilyCategoryId] = useState("all");
  const [taxonomyNodeId, setTaxonomyNodeId] = useState("all");
  const [coffeeForm, setCoffeeForm] = useState("all");
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const load = useCallback(async () => {
    try {
      const [mediaResponse, taxonomyResponse] = await Promise.all([
        fetch("/api/admin/media", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/admin/taxonomy?view=tree&consumer=media-workspace-v2", { cache: "no-store", credentials: "same-origin" }),
      ]);
      if (mediaResponse.status === 401 || taxonomyResponse.status === 401) { onUnauthorized(); return; }
      const [mediaResult, taxonomyResult] = await Promise.all([
        mediaResponse.json().catch(() => ({})),
        taxonomyResponse.json().catch(() => ({})),
      ]);
      if (!mediaResponse.ok || !taxonomyResponse.ok) throw new Error(mediaResult.reason || taxonomyResult.reason || "load_failed");
      setRows(mediaResult.records || []);
      setTaxonomy(taxonomyResult.categories || []);
      setSuspicious(mediaResult.suspicious || []);
      setState("ready");
    } catch { setState("error"); }
  }, [onUnauthorized]);
  useEffect(() => { const handle = window.setTimeout(load, 0); return () => window.clearTimeout(handle); }, [load]);
  const roleLabels: Record<string,string> = { cafe:"مقهى",roaster:"محمصة",seller:"بائع أو متجر",equipment_supplier:"مورد معدات",manufacturer:"مصنّع",importer:"مستورد",service_provider:"تعليم/تدريب أو خدمة",other:"أخرى" };
  const categoryById = new Map(taxonomy.map((category) => [category.id, category]));
  const ancestorsOf = (categoryIdValue: string | null) => {
    const ancestors: MediaTaxonomy[] = [];
    const visited = new Set<string>();
    let current = categoryIdValue ? categoryById.get(categoryIdValue) : undefined;
    while (current && !visited.has(current.id)) {
      ancestors.push(current); visited.add(current.id);
      current = current.parent_id ? categoryById.get(current.parent_id) : undefined;
    }
    return ancestors;
  };
  const categoryPath = (categoryIdValue: string | null) => ancestorsOf(categoryIdValue).reverse().map((category) => category.name_ar).join(" ← ");
  const scoped = rows.filter((row) => row.scope === scope && (scope === "master" || row.entity === participantRecord));
  const roleScoped = scoped.filter((row) => role === "all" || (row.organizationRoles || [row.organizationRole || ""]).includes(role));
  const organizations = [...new Map(roleScoped.filter((row) => row.organizationId).map((row) => [row.organizationId, row.organizationName])).entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),"ar"));
  const selectableTaxonomy = taxonomy.filter((category) => category.status !== "archived" && category.is_navigation_visible);
  const rootOptions = selectableTaxonomy.filter((category) => !category.navigation_parent_id);
  const familyOptions = rootCategoryId === "all" ? [] : selectableTaxonomy.filter((category) => category.navigation_parent_id === rootCategoryId);
  const subcategoryOptions = familyCategoryId === "all" ? [] : selectableTaxonomy.filter((category) => category.navigation_parent_id === familyCategoryId);
  const selectedTaxonomyId = taxonomyNodeId !== "all" ? taxonomyNodeId : familyCategoryId !== "all" ? familyCategoryId : (rootCategoryId !== "all" ? rootCategoryId : null);
  const selectedRoot = categoryById.get(rootCategoryId);
  const availableRoles = Object.entries(roleLabels).filter(([value]) => scoped.some((row) => (row.organizationRoles || [row.organizationRole || ""]).includes(value)));
  const matchesTaxonomy = (row: MediaLibraryRow) => row.entity === "organizations" || !selectedTaxonomyId || row.categoryPathIds.includes(selectedTaxonomyId);
  const visible = scoped.filter((row) => (scope === "master" || role === "all" || (row.organizationRoles || [row.organizationRole || ""]).includes(role)) && (scope === "master" || organizationId === "all" || row.organizationId === organizationId) && matchesTaxonomy(row) && (row.entity === "organizations" || coffeeForm === "all" || row.coffeeForm === coffeeForm) && (!query.trim() || `${row.label} ${row.organizationName || ""}`.toLocaleLowerCase("ar-IQ").includes(query.trim().toLocaleLowerCase("ar-IQ"))));
  return <section className="media-library" id="operations-media"><div className="section-head"><div><span className="eyebrow">مكتبة الأصول</span><h2>الصور والملفات</h2></div><span>{visible.length} سجل</span></div><p>اختر أولاً بطاقة منتج رئيسية أو جهة مشاركة، ثم صفِّ الجهة ونوع المنتج. فتح السجل يتيح مشاهدة الصور ورفعها أو حذفها مع حقوقها.</p>
    {suspicious.length > 0 && <details className="suspect-media-list"><summary><b>صور مشكوك في ربطها أو توثيقها</b><span>{suspicious.length} — للعرض فقط، لم نحذف شيئاً</span></summary>{suspicious.map((item)=><article key={item.id}><div><b>{item.label}</b><span>{item.reason}</span><small>الوصف الحالي: {item.altAr}</small></div><button type="button" onClick={()=>onOpen({entity:item.entity,id:item.entityId})}>فتح للتدقيق</button></article>)}</details>}
    <div className="media-scope-picker"><button type="button" className={scope === "master" ? "active" : ""} onClick={() => { setScope("master"); setRole("all"); setOrganizationId("all"); setRootCategoryId("all"); setFamilyCategoryId("all"); setTaxonomyNodeId("all"); setCoffeeForm("all"); }}>بطاقات المنتجات الرئيسية</button><button type="button" className={scope === "participant" ? "active" : ""} onClick={() => { setScope("participant"); setParticipantRecord("offers"); setRole("all"); setOrganizationId("all"); setRootCategoryId("all"); setFamilyCategoryId("all"); setTaxonomyNodeId("all"); setCoffeeForm("all"); }}>الجهات والبائعون ومنتجاتهم</button></div>
    {scope === "participant" && <div className="media-record-picker"><button type="button" className={participantRecord === "offers" ? "active" : ""} onClick={()=>{setParticipantRecord("offers");setRootCategoryId("all");setFamilyCategoryId("all");setTaxonomyNodeId("all");setCoffeeForm("all");}}>صور منتجات لدى جهة أو بائع</button><button type="button" className={participantRecord === "organizations" ? "active" : ""} onClick={()=>{setParticipantRecord("organizations");setRootCategoryId("all");setFamilyCategoryId("all");setTaxonomyNodeId("all");setCoffeeForm("all");}}>صور صفحة الجهة نفسها</button></div>}
    <div className="published-toolbar published-filter-grid media-filter-grid">{scope === "participant" && <><label>نوع الجهة<select value={role} onChange={(event) => { setRole(event.target.value); setOrganizationId("all"); }}><option value="all">كل الجهات التي لديها سجلات</option>{availableRoles.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>الجهة<select value={organizationId} onChange={(event)=>setOrganizationId(event.target.value)}><option value="all">كل الجهات</option>{organizations.map(([id,name])=><option key={id} value={id || ""}>{name}</option>)}</select></label></>}{(scope === "master" || participantRecord === "offers") && <><label>قسم المنصة<select value={rootCategoryId} onChange={(event)=>{setRootCategoryId(event.target.value);setFamilyCategoryId("all");setTaxonomyNodeId("all");setCoffeeForm("all");}}><option value="all">كل أقسام التصنيف</option>{rootOptions.map((category)=><option value={category.id} key={category.id}>{category.name_ar}</option>)}</select></label><label>العائلة الرئيسية<select value={familyCategoryId} disabled={state !== "ready" || rootCategoryId === "all"} onChange={(event)=>{setFamilyCategoryId(event.target.value);setTaxonomyNodeId("all");}}><option value="all">{rootCategoryId === "all" ? "اختر قسم المنصة أولاً" : `كل عوائل ${selectedRoot?.name_ar || "القسم"}`}</option>{familyOptions.map((category)=><option value={category.id} key={category.id}>{category.name_ar}</option>)}</select></label><label>التصنيف الفرعي<select value={taxonomyNodeId} disabled={state !== "ready" || familyCategoryId === "all"} onChange={(event)=>setTaxonomyNodeId(event.target.value)}><option value="all">{familyCategoryId === "all" ? "اختر العائلة الرئيسية أولاً" : "كل التصنيفات الفرعية"}</option>{subcategoryOptions.map((category)=><option value={category.id} key={category.id}>{category.name_ar}</option>)}</select><small>{familyCategoryId === "all" ? "اختر إحدى العوائل الرئيسية لعرض المستوى الثاني حتى لو لم توجد صور." : `${subcategoryOptions.length} تصنيفاً في المستوى الثاني.`}</small></label>{selectedRoot?.code.startsWith("COF") && <label>شكل القهوة<select value={coffeeForm} onChange={(event)=>setCoffeeForm(event.target.value)}><option value="all">حبوب ومطحونة</option><option value="whole">حبوب كاملة</option><option value="ground">مطحونة</option></select></label>}</>}<label>بحث بالاسم<input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="اسم المنتج أو الجهة" /></label></div>
    {state === "loading" ? <p>جارٍ تحميل مكتبة الصور…</p> : state === "error" ? <div className="directory-state compact"><h3>تعذر تحميل بيانات مكتبة الصور</h3><p>لم نعرض فلاتر فارغة على أنها بيانات صحيحة. أعد المحاولة، وإذا انتهت الجلسة ستظهر شاشة الدخول تلقائياً.</p><button type="button" onClick={()=>{setState("loading");load();}}>إعادة المحاولة</button></div> : <div className="media-library-list">{visible.slice(0,300).map((row)=><article key={`${row.entity}-${row.id}`}><div><span className="entity-kind-badge">{row.scope === "master" ? "بطاقة رئيسية" : row.entity === "offers" ? "منتج لدى بائع" : "صفحة جهة"}</span><b>{row.label}</b><span>{row.organizationName && row.entity === "offers" ? `${row.organizationName} · ` : ""}{categoryPath(row.categoryId) || row.productKind}{row.coffeeForm ? ` · ${attributeValueLabels[row.coffeeForm] || row.coffeeForm}` : ""} · {row.status}</span></div><div><b>{row.mediaCount}</b><span>صورة</span><button type="button" onClick={()=>onOpen({entity:row.entity,id:row.id})}>فتح الصور والتعديل</button></div></article>)}{!visible.length && <p>لا توجد سجلات مطابقة للفلاتر.</p>}</div>}
  </section>;
}

type PartnerSubmission = { id: string; organization_id: string; entity_type: string; payload: Record<string, any>; status: string; review_note: string | null; updated_at: string };
type PartnerData = { user: { email?: string }; memberships: Array<{ organization_id: string; member_role: string; organizations: { name_ar: string; slug: string } | null }>; submissions: PartnerSubmission[]; products: Array<{ id: string; name_ar: string; product_kind: string }>; categories: Array<{ id: string; code: string; name_ar: string; parent_id: string | null }> };

function PartnerPortal() {
  const [state,setState]=useState<"loading"|"signed_out"|"ready"|"error">("loading");
  const [data,setData]=useState<PartnerData|null>(null);
  const [message,setMessage]=useState("");
  const [entityType,setEntityType]=useState("product_offer");
  const [working,setWorking]=useState(false);
  const [queued,setQueued]=useState(0);
  const queueKey="qahwatna-partner-offline-v1";
  const load=useCallback(async()=>{const response=await fetch("/api/partner/submissions",{cache:"no-store"});if(response.status===401){setState("signed_out");setData(null);return;}const payload=await response.json();if(!response.ok)throw new Error("load_failed");setData(payload);setState("ready");},[]);
  const readQueue=useCallback(()=>{try{return JSON.parse(localStorage.getItem(queueKey)||"[]") as any[];}catch{return [];}},[]);
  const writeQueue=useCallback((items:any[])=>{localStorage.setItem(queueKey,JSON.stringify(items));setQueued(items.length);},[]);
  const send=useCallback(async(item:any)=>{const response=await fetch("/api/partner/submissions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(item)});if(!response.ok)throw new Error(String(response.status));return response.json();},[]);
  const flush=useCallback(async()=>{if(!navigator.onLine)return;const items=readQueue();if(!items.length)return;const remaining=[];for(const item of items){try{await send(item);}catch{remaining.push(item);}}writeQueue(remaining);if(remaining.length===0){setMessage("تمت مزامنة الطلبات المحفوظة على الجهاز.");await load();}},[load,readQueue,send,writeQueue]);
  useEffect(()=>{const timer=window.setTimeout(()=>{setQueued(readQueue().length);load().catch(()=>setState("error"));},0);const online=()=>flush();window.addEventListener("online",online);return()=>{window.clearTimeout(timer);window.removeEventListener("online",online);};},[flush,load,readQueue]);
  const login=async(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();setMessage("");const form=new FormData(event.currentTarget);const response=await fetch("/api/partner/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:form.get("email"),password:form.get("password")})});if(!response.ok){const result=await response.json().catch(()=>({}));setMessage(result.reason==="active_membership_required"?"الحساب صحيح، لكن عضوية الجهة لم تُفعّل بعد.":"تعذر الدخول. تحقق من البريد وكلمة المرور.");return;}setState("loading");await load();};
  const submit=async(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();if(!data?.memberships[0])return;const formElement=event.currentTarget;const form=new FormData(formElement);const payload:Record<string,unknown>=entityType==="organization_update"?{name_ar:form.get("name_ar"),phone:form.get("phone"),email:form.get("email"),website_url:form.get("website_url"),description_ar:form.get("description_ar")} : entityType==="location"?{name_ar:form.get("name_ar"),address_ar:form.get("address_ar"),district_ar:form.get("district_ar"),phone:form.get("phone")} : entityType==="product_offer"?{product_id:form.get("product_id"),price:form.get("price"),currency_code:"IQD",availability:form.get("availability"),external_url:form.get("evidence_url"),observed_at:new Date().toISOString(),source_label:"بوابة الجهة المشاركة",source_type:"organization"} : {name_ar:form.get("name_ar"),name_en:form.get("name_en"),product_kind:form.get("product_kind"),category_id:form.get("category_id"),model_number:form.get("model_number"),summary_ar:form.get("summary_ar"),source_label:"بوابة الجهة المشاركة",source_type:"organization"};
    const item={organizationId:data.memberships[0].organization_id,entityType,payload,idempotencyKey:crypto.randomUUID(),clientUpdatedAt:new Date().toISOString(),status:"submitted"};setWorking(true);setMessage("جارٍ إرسال الطلب للمراجعة…");try{await send(item);setMessage("تم الإرسال. لن يظهر التغيير للعامة إلا بعد مراجعة فريق قهوتنا.");formElement.reset();await load();}catch{const items=readQueue();items.push(item);writeQueue(items);setMessage("الشبكة غير مستقرة؛ حُفظ الطلب على هذا الجهاز وسيُرسل تلقائياً عند عودة الاتصال.");}finally{setWorking(false);}};
  const statusLabel:Record<string,string>={draft:"مسودة",submitted:"مرسل للمراجعة",in_review:"قيد المراجعة",needs_changes:"يحتاج تعديلاً",approved:"معتمد",rejected:"مرفوض",archived:"مؤرشف"};
  if(state==="loading")return <section className="partner-portal"><p role="status">جارٍ فحص حساب الجهة…</p></section>;
  if(state==="error")return <section className="partner-portal directory-state"><h2>تعذر تحميل بوابة الجهة</h2><button onClick={()=>{setState("loading");load().catch(()=>setState("error"));}}>إعادة المحاولة</button></section>;
  if(state==="signed_out")return <section className="partner-portal"><form className="admin-login" onSubmit={login}><b>الدخول بحساب الجهة أو البائع</b><p>الحساب يحتاج عضوية جهة مفعلة من إدارة قهوتنا.</p><label>البريد الإلكتروني<input name="email" type="email" autoComplete="username" required /></label><label>كلمة المرور<input name="password" type="password" autoComplete="current-password" minLength={8} required /></label><button className="primary" type="submit">دخول بوابة الجهة</button>{message&&<p role="status">{message}</p>}</form></section>;
  const membership=data!.memberships[0];
  return <section className="partner-portal"><div className="section-head"><div><span className="eyebrow">بوابة خاضعة للمراجعة</span><h2>{membership.organizations?.name_ar||"الجهة المشاركة"}</h2><p>{data!.user.email} · {membership.member_role}</p></div><button type="button" onClick={async()=>{await fetch("/api/partner/logout",{method:"POST"});setState("signed_out");setData(null);}}>تسجيل الخروج</button></div><div className="partner-safety"><b>لا يوجد نشر مباشر</b><span>كل تعديل يُحفظ كطلب مستقل، يراجعه فريق قهوتنا، ثم يُعتمد أو يعاد إليك بملاحظة.</span>{queued>0&&<button type="button" onClick={flush}>{queued} طلب بانتظار المزامنة</button>}</div>
    <form className="partner-submission-form" onSubmit={submit}><label>طبيعة الإدخال<select value={entityType} onChange={e=>setEntityType(e.target.value)}><option value="product_offer">منتج موجود لدى بائع: سعر وتوفر</option><option value="new_product">اقتراح بطاقة منتج رئيسية جديدة</option><option value="organization_update">تحديث معلومات الجهة</option><option value="location">إضافة موقع أو فرع في بغداد</option></select></label>
    {entityType==="product_offer"&&<><label>المنتج الرئيسي<select name="product_id" required><option value="">اختر المنتج</option>{data!.products.map(p=><option key={p.id} value={p.id}>{p.name_ar}</option>)}</select></label><label>السعر بالدينار العراقي<input name="price" type="number" min="0" step="1" required /></label><label>التوفر<select name="availability"><option value="in_stock">متوفر</option><option value="out_of_stock">غير متوفر</option><option value="preorder">طلب مسبق</option><option value="unknown">غير متحقق</option></select></label><label className="wide">رابط دليل السعر أو التوفر<input name="evidence_url" type="url" required /></label></>}
    {entityType==="new_product"&&<><label>الاسم العربي<input name="name_ar" required minLength={2}/></label><label>الاسم الإنجليزي<input name="name_en" /></label><label>قسم المنتج<select name="product_kind" required><option value="roasted_coffee">قهوة محمصة</option><option value="equipment">معدات</option><option value="consumable">مستهلكات</option><option value="care_product">عناية وصيانة</option><option value="replacement_part">قطع غيار</option></select></label><label>الفئة الدقيقة<select name="category_id" required><option value="">اختر الفئة</option>{data!.categories.filter(c=>c.parent_id).map(c=><option key={c.id} value={c.id}>{c.name_ar}</option>)}</select></label><label>الموديل<input name="model_number" /></label><label className="wide">ملخص المنتج<textarea name="summary_ar" /></label></>}
    {entityType==="organization_update"&&<><label>اسم الجهة<input name="name_ar" defaultValue={membership.organizations?.name_ar||""} required /></label><label>الهاتف<input name="phone" /></label><label>البريد<input name="email" type="email" /></label><label>الموقع الرسمي إن وجد<input name="website_url" type="url" /></label><label className="wide">الوصف<textarea name="description_ar" /></label></>}
    {entityType==="location"&&<><label>اسم الفرع<input name="name_ar" /></label><label>المنطقة<input name="district_ar" required /></label><label className="wide">العنوان في بغداد<input name="address_ar" required minLength={3}/></label><label>هاتف الفرع<input name="phone" /></label></>}
    <button className="primary wide" type="submit" disabled={working}>{working?"جارٍ الحفظ…":"إرسال للمراجعة"}</button>{message&&<p className="admin-message wide" role="status">{message}</p>}</form>
    <section className="partner-history"><div className="section-head"><div><span className="eyebrow">سجل شفاف</span><h3>طلبات الجهة</h3></div><span>{data!.submissions.length}</span></div>{data!.submissions.map(row=><article key={row.id}><div><b>{({product_offer:"عرض منتج",new_product:"منتج رئيسي جديد",organization_update:"تحديث جهة",location:"فرع أو موقع"} as Record<string,string>)[row.entity_type]||row.entity_type}</b><span>{new Date(row.updated_at).toLocaleString("ar-IQ")}</span></div><div><strong>{statusLabel[row.status]||row.status}</strong>{row.review_note&&<small>{row.review_note}</small>}</div></article>)}{!data!.submissions.length&&<p>لا توجد طلبات بعد.</p>}</section></section>;
}

function PartnerReviewQueue() {
  const [items,setItems]=useState<any[]>([]);const [memberships,setMemberships]=useState<any[]>([]);const [organizations,setOrganizations]=useState<any[]>([]);const [state,setState]=useState("loading");const [working,setWorking]=useState("");const [message,setMessage]=useState("");
  const applyData=(data:any)=>{setItems(data.submissions||[]);setMemberships(data.memberships||[]);setOrganizations(data.organizations||[]);};
  const load=useCallback(async()=>{const response=await fetch("/api/admin/partner-submissions",{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error("load_failed");applyData(data);setState("ready");},[]);
  useEffect(()=>{const timer=window.setTimeout(()=>{load().catch(()=>setState("error"));},0);return()=>window.clearTimeout(timer);},[load]);
  const decide=async(id:string,status:string)=>{const reviewNote=status==="needs_changes"||status==="rejected"?window.prompt("اكتب الملاحظة التي ستظهر للجهة (10 أحرف على الأقل):")||"":"";if((status==="needs_changes"||status==="rejected")&&reviewNote.trim().length<10)return;setWorking(id);const response=await fetch("/api/admin/partner-submissions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id,status,reviewNote})});const data=await response.json();setWorking("");if(!response.ok){window.alert(`تعذر تنفيذ القرار: ${data.reason||"خطأ غير معروف"}`);return;}applyData(data);};
  const saveMembership=async(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();const form=new FormData(event.currentTarget);setWorking("membership");setMessage("");const response=await fetch("/api/admin/partner-submissions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"upsert_membership",organizationId:form.get("organizationId"),userId:form.get("userId"),memberRole:form.get("memberRole"),status:form.get("status")})});const data=await response.json();setWorking("");if(!response.ok){setMessage(data.reason==="profile_or_organization_missing"?"معرف المستخدم غير موجود في Profiles أو الجهة غير موجودة.":"تعذر حفظ العضوية؛ العملية تحتاج صلاحية المدير.");return;}applyData(data);setMessage("تم حفظ عضوية الجهة وصلاحيتها.");};
  if(state==="loading")return <p>جارٍ تحميل طلبات الجهات…</p>;if(state==="error")return <p>تعذر تحميل طلبات الجهات.</p>;
  return <section className="partner-review"><div className="section-head"><div><span className="eyebrow">دخول من بوابة الشركاء</span><h2>طلبات الجهات والبائعين</h2></div><span>{items.length}</span></div><p>الاعتماد ينشئ مسودة تشغيلية أو يطبق تحديث الجهة، ولا يتيح للبائع النشر المباشر.</p><details className="partner-membership-admin"><summary>إدارة حسابات الجهات وصلاحياتها ({memberships.length})</summary><form className="partner-submission-form" onSubmit={saveMembership}><label>الجهة<select name="organizationId" required><option value="">اختر الجهة</option>{organizations.map(org=><option key={org.id} value={org.id}>{org.name_ar}</option>)}</select></label><label>معرف المستخدم في Supabase Profiles<input name="userId" required pattern="[0-9a-fA-F-]{36}" placeholder="UUID" /></label><label>الدور<select name="memberRole"><option value="owner">مالك</option><option value="manager">مدير جهة</option><option value="editor">مدخل بيانات</option></select></label><label>الحالة<select name="status"><option value="active">مفعلة</option><option value="suspended">موقوفة</option><option value="revoked">ملغاة</option></select></label><button className="primary wide" disabled={working==="membership"}>حفظ العضوية</button>{message&&<p className="admin-message wide">{message}</p>}</form></details>{items.map(row=><article key={row.id}><div><b>{row.organizations?.name_ar||row.organization_id}</b><span>{row.entity_type} · {row.status} · {new Date(row.updated_at).toLocaleString("ar-IQ")}</span><details><summary>معاينة البيانات</summary><pre>{JSON.stringify(row.payload,null,2)}</pre></details></div><div className="queue-actions"><button disabled={working===row.id} onClick={()=>decide(row.id,"in_review")}>بدء المراجعة</button><button disabled={working===row.id} onClick={()=>decide(row.id,"needs_changes")}>إعادة للتعديل</button><button disabled={working===row.id} onClick={()=>decide(row.id,"approved")}>اعتماد وتحويل</button><button disabled={working===row.id} onClick={()=>decide(row.id,"rejected")}>رفض</button></div></article>)}{!items.length&&<p>لا توجد طلبات جهات بانتظار المراجعة.</p>}</section>;
}

type QualitySuspect = { id: string; entity: string; entityId: string | null; label: string; reason: string; severity: string; recommendedAction?: string | null; issueDetails?: { issueCode: string; issueType: string | null; fieldCode: string | null; message: string; createdAt: string; batchCode: string | null; sourceLabel: string | null; sourceRowNumber: number | null; rawPayload: Record<string, unknown> | null; normalizedPayload: Record<string, unknown> | null } };

function QualityIssueEditor({ issue, candidates, canDecide, onClose, onUpdated }: { issue: QualitySuspect; candidates: Array<{ entity: string; id: string; label: string }>; canDecide: boolean; onClose: () => void; onUpdated: (data: any) => void }) {
  const [target, setTarget] = useState(issue.entityId ? `${issue.entity}:${issue.entityId}` : "");
  const [status, setStatus] = useState("open");
  const [resolutionNote, setResolutionNote] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canDecide) { setMessage("هذه العملية تحتاج صلاحية المراجع أو المدير."); return; }
    if (status !== "open" && resolutionNote.trim().length < 10) { setMessage("اكتب سبب القرار أو الإجراء المنفذ بعشرة أحرف على الأقل."); return; }
    const [targetEntity, targetId] = target ? target.split(":") : ["", ""];
    setWorking(true); setMessage("جارٍ توثيق القرار…");
    const response = await fetch("/api/admin/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "process_quality_issue", id: issue.id, status, resolutionNote, targetEntity: targetEntity || null, targetId: targetId || null }) });
    const data = await response.json().catch(() => ({})); setWorking(false);
    if (!response.ok) { setMessage(data.reason === "target_not_found" ? "السجل المختار لم يعد موجوداً." : data.reason === "verifier_required" ? "هذه العملية تحتاج صلاحية المراجع أو المدير." : "تعذر حفظ القرار؛ تحقق من الحقول ثم حاول مجدداً."); return; }
    onUpdated(data); onClose();
  };
  const details = issue.issueDetails;
  return <div className="record-editor-backdrop" role="dialog" aria-modal="true" aria-label="تفاصيل ملاحظة الجودة"><section className="record-editor quality-issue-modal"><div className="section-head"><div><span className={`quality-severity ${issue.severity}`}>{issue.severity}</span><h2>{issue.label}</h2></div><button type="button" onClick={onClose}>إغلاق</button></div><p>{details?.message || issue.reason}</p>{issue.recommendedAction && <div className="quality-recommendation"><b>الإجراء المقترح</b><span>{issue.recommendedAction}</span></div>}<dl className="quality-issue-metadata"><div><dt>رمز الملاحظة</dt><dd>{details?.issueCode || issue.id}</dd></div><div><dt>نوعها</dt><dd>{details?.issueType || "عام"}</dd></div><div><dt>الحقل</dt><dd>{details?.fieldCode || "غير محدد"}</dd></div><div><dt>دفعة الإدخال</dt><dd>{details?.batchCode || "ليست ضمن دفعة"}</dd></div><div><dt>المصدر</dt><dd>{details?.sourceLabel || "غير محدد"}</dd></div><div><dt>رقم الصف</dt><dd>{details?.sourceRowNumber || "—"}</dd></div></dl>{details?.rawPayload && <details className="quality-payload"><summary>عرض البيانات الأصلية الواردة</summary><pre>{JSON.stringify(details.rawPayload, null, 2)}</pre></details>}<form className="catalog-draft-form quality-decision-form" onSubmit={save}><label className="wide">ربط الملاحظة بسجل<select value={target} onChange={(event)=>setTarget(event.target.value)}><option value="">تبقى ملاحظة عامة غير مرتبطة</option>{candidates.map((item)=><option key={`${item.entity}:${item.id}`} value={`${item.entity}:${item.id}`}>{item.label} — {item.entity}</option>)}</select></label><label>القرار<select value={status} onChange={(event)=>setStatus(event.target.value)}><option value="open">تبقى مفتوحة</option><option value="fixed">تم التصحيح</option><option value="accepted">مقبولة بقرار إداري</option><option value="dismissed">تنبيه غير منطبق</option></select></label><label className="wide">سبب القرار أو الإجراء<textarea value={resolutionNote} onChange={(event)=>setResolutionNote(event.target.value)} placeholder="اكتب ما تم التحقق منه أو سبب القرار…" /></label>{message && <p className="admin-message wide" role="status">{message}</p>}<div className="queue-actions wide"><button type="submit" disabled={working || !canDecide}>{working ? "جارٍ الحفظ…" : "حفظ القرار وتوثيقه"}</button><button type="button" onClick={onClose}>إلغاء</button></div></form></section></div>;
}

function Operations() {
  const status = usePlatformStatus();
  const directory = usePublicDirectory();
  const [adminState, setAdminState] = useState<
    "loading" | "signed_out" | "ready" | "error"
  >("loading");
  const [adminData, setAdminData] = useState<{
    profile: { display_name: string | null; role: "editor" | "verifier" | "admin" };
    queues: Record<
      string,
      Array<{
        id: string;
        label: string;
        status: string;
        evidence: string;
        updated_at: string | null;
        ready: boolean;
        blockers: string[];
        warnings: string[];
      }>
    >;
    searchGovernance: {
      terms: Array<{
        id: string;
        canonical_term_ar: string;
        canonical_term_en: string | null;
        aliases: string[];
        intent: SearchIntent;
        entity_scope: SearchEntityType[];
        match_mode: string;
        weight: number;
        source_basis: string;
        status: "draft" | "active" | "retired";
        updated_at: string;
      }>;
      weakQueries: Array<{
        query: string;
        searches: number;
        zeroResults: number;
        lowResults: number;
        lastSearchedAt: string;
        inferredIntent: SearchIntent;
      }>;
      totalEventsReviewed: number;
      activeTerms: number;
      draftTerms: number;
    };
    supportWorkspace: { requests: any[]; staff: any[] };
    inactiveCatalog: Array<{ entity: string; id: string; label: string; status: string; updated_at: string }>;
    publishedCatalog: Array<{ entity: string; section: string; group: string; id: string; label: string; meta: string; updated_at: string }>;
    qualityDesk: {
      summary: { openIssues: number; missingProductImages: number; missingOfferImages: number; recordsPendingReview: number };
      suspects: QualitySuspect[];
      mediaBacklog: Array<{ entity: string; id: string; label: string; kind: string }>;
    };
  } | null>(null);
  const [adminMessage, setAdminMessage] = useState("");
  const [workingId, setWorkingId] = useState("");
  const [recordEditor, setRecordEditor] = useState<{ entity: string; id: string } | null>(null);
  const [qualityIssueEditor, setQualityIssueEditor] = useState<QualitySuspect | null>(null);
  const [editingSearchTermId, setEditingSearchTermId] = useState("");
  const [searchTermView, setSearchTermView] = useState<"active" | "draft" | "retired" | "all">("active");
  const [searchTermQuery, setSearchTermQuery] = useState("");
  const [publishedType, setPublishedType] = useState("all");
  const [publishedGroup, setPublishedGroup] = useState("all");
  const [searchLetter, setSearchLetter] = useState("all");
  const [publishedQuery, setPublishedQuery] = useState("");
  const [workspace, setWorkspace] = useState<"dashboard" | "records" | "entry" | "review" | "partners" | "media" | "imports" | "search" | "requests" | "archive" | "taxonomy">("dashboard");

  const loadAdmin = async () => {
    const response = await fetch("/api/admin/review", { cache: "no-store" });
    if (response.status === 401) {
      setAdminState("signed_out");
      setAdminData(null);
      return;
    }
    const data = await response.json();
    if (!response.ok) throw new Error(data.reason || "load_failed");
    setAdminData(data);
    setAdminState("ready");
  };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      loadAdmin().catch(() => setAdminState("error"));
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);

  const login = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAdminMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    if (!response.ok) {
      setAdminMessage("تعذر الدخول. تحقق من بريد وكلمة مرور مستخدم Supabase.");
      return;
    }
    setAdminState("loading");
    await loadAdmin().catch(() => setAdminState("error"));
  };

  const setReviewStatus = async (table: string, id: string, next: string, overrideReason = "") => {
    if (
      next === "published" &&
      !window.confirm("هذا الإجراء سينشر السجل فوراً. هل راجعت المصدر والحقول وتريد المتابعة؟")
    ) return;
    setWorkingId(id);
    setAdminMessage("");
    const response = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ table, id, status: next, overrideReason }),
    });
    const data = await response.json();
    setWorkingId("");
    if (!response.ok) {
      setAdminMessage(
        data.reason === "publish_requirements"
          ? `تعذر النشر: ${(data.blockers || ["السجل لا يحقق متطلبات الاعتماد"]).join("، ")}`
          : "تعذر تحديث السجل. أعد تسجيل الدخول ثم حاول مجدداً.",
      );
      return;
    }
    setAdminData((current) =>
      current ? { ...current, queues: data.queues, searchGovernance: data.searchGovernance, supportWorkspace: data.supportWorkspace, publishedCatalog: data.publishedCatalog, inactiveCatalog: data.inactiveCatalog } : current,
    );
    setAdminMessage("تم تحديث الحالة وتسجيل العملية في سجل التدقيق.");
  };
  const deleteCatalogRecord = async (table: string, id: string, label: string) => {
    const typed = window.prompt(`حذف نهائي للسجل غير المنشور «${label}» مع علاقاته. اكتب كلمة حذف للتأكيد:`);
    if (typed?.trim() !== "حذف") return;
    setWorkingId(id); setAdminMessage("");
    const response = await fetch("/api/admin/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "delete_catalog_record", table, id }) });
    const data = await response.json(); setWorkingId("");
    if (!response.ok) { setAdminMessage(data.reason === "record_has_dependencies" ? "لا يمكن حذف السجل لأن سجلات أخرى تعتمد عليه. افصل العلاقات أو أرشفه." : "تعذر حذف السجل."); return; }
    setAdminData((current) => current ? { ...current, queues: data.queues, searchGovernance: data.searchGovernance, supportWorkspace: data.supportWorkspace, publishedCatalog: data.publishedCatalog, inactiveCatalog: data.inactiveCatalog } : current);
    setAdminMessage("حُذف السجل غير المنشور نهائياً وسُجلت العملية.");
  };
  const processRightsRequest = async (id: string, status: string) => {
    const final = ["approved", "rejected", "closed"].includes(status);
    const resolutionNote = final ? window.prompt("اكتب نتيجة المعالجة وسبب القرار (10 أحرف على الأقل):") || "" : "";
    if (final && resolutionNote.trim().length < 10) return;
    setWorkingId(id); setAdminMessage("");
    const response = await fetch("/api/admin/review", { method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"process_rights_request",id,status,resolutionNote}) });
    const data=await response.json(); setWorkingId("");
    if(!response.ok){setAdminMessage("تعذر معالجة طلب الحقوق؛ القرار النهائي يحتاج ملاحظة واضحة.");return;}
    setAdminData((current)=>current?{...current,queues:data.queues,searchGovernance:data.searchGovernance,supportWorkspace:data.supportWorkspace,publishedCatalog:data.publishedCatalog,inactiveCatalog:data.inactiveCatalog}:current);
    setAdminMessage("تم تحديث طلب الحقوق وتوثيق القرار.");
  };
  const createSearchTerm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const canonicalTermAr = String(form.get("canonicalTermAr") || "");
    const intent = String(form.get("intent") || "");
    const aliases = String(form.get("aliases") || "").split(/[،,]/).map((value) => value.trim()).filter(Boolean);
    const entityScope = form.getAll("entityScope").map(String);
    setWorkingId("new-search-term");
    setAdminMessage("");
    const response = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create_search_term",
        canonicalTermAr,
        canonicalTermEn: form.get("canonicalTermEn"),
        aliases,
        intent,
        entityScope,
        matchMode: form.get("matchMode"),
        weight: Number(form.get("weight")),
        sourceBasis: form.get("sourceBasis"),
      }),
    });
    const data = await response.json();
    setWorkingId("");
    if (!response.ok) {
      setAdminMessage(data.reason === "invalid_input" ? "أكمل المصطلح والمقصد وحدد قسماً واحداً على الأقل." : "تعذر إنشاء المصطلح؛ تحقق من أنه غير مكرر.");
      return;
    }
    setAdminData((current) => current ? { ...current, queues: data.queues, searchGovernance: data.searchGovernance, supportWorkspace: data.supportWorkspace, publishedCatalog: data.publishedCatalog, inactiveCatalog: data.inactiveCatalog } : current);
    formElement.reset();
    setAdminMessage("أضيف المصطلح كمسودة. راجعه ثم فعّله من القائمة.");
  };
  const setSearchTermStatus = async (id: string, next: "draft" | "active" | "retired") => {
    if (next === "active" && !window.confirm("سيؤثر هذا المصطلح فوراً في فهم البحث وترتيب النتائج. هل راجعت معناه والمرادفات؟")) return;
    setWorkingId(id);
    setAdminMessage("");
    const response = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "set_search_term_status", id, status: next }),
    });
    const data = await response.json();
    setWorkingId("");
    if (!response.ok) {
      setAdminMessage("تعذر تغيير حالة المصطلح. أعد تسجيل الدخول ثم حاول مجدداً.");
      return;
    }
    setAdminData((current) => current ? { ...current, queues: data.queues, searchGovernance: data.searchGovernance, supportWorkspace: data.supportWorkspace, publishedCatalog: data.publishedCatalog, inactiveCatalog: data.inactiveCatalog } : current);
    setAdminMessage("تم تحديث قاعدة البحث وتسجيل القرار.");
  };
  const deleteSearchTerm = async (id: string) => {
    if (!window.confirm("سيُحذف هذا المصطلح غير الفعال نهائياً من القاموس. هل تريد المتابعة؟")) return;
    setWorkingId(id);
    const response = await fetch("/api/admin/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "delete_search_term", id }) });
    const data = await response.json();
    setWorkingId("");
    if (!response.ok) { setAdminMessage(data.reason === "active_term_cannot_be_deleted" ? "أوقف المصطلح الفعال أولاً ثم احذفه." : "تعذر حذف المصطلح."); return; }
    setAdminData((current) => current ? { ...current, queues: data.queues, searchGovernance: data.searchGovernance, supportWorkspace: data.supportWorkspace, publishedCatalog: data.publishedCatalog, inactiveCatalog: data.inactiveCatalog } : current);
    setAdminMessage("حُذف المصطلح غير الفعال وسُجلت العملية.");
  };
  const arabicLetters = ["ا", "ب", "ت", "ث", "ج", "ح", "خ", "د", "ذ", "ر", "ز", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق", "ك", "ل", "م", "ن", "ه", "و", "ي"];
  const normalizeFirstLetter = (value: string) => value.trim().replace(/^[إأآ]/, "ا").charAt(0);
  const visibleSearchTerms = (adminData?.searchGovernance.terms || []).filter((term) => (searchTermView === "all" || term.status === searchTermView) && (searchLetter === "all" || normalizeFirstLetter(term.canonical_term_ar) === searchLetter) && (!searchTermQuery.trim() || [term.canonical_term_ar, term.canonical_term_en, ...term.aliases].filter(Boolean).join(" ").toLocaleLowerCase("ar-IQ").includes(searchTermQuery.trim().toLocaleLowerCase("ar-IQ")))).sort((a, b) => a.canonical_term_ar.localeCompare(b.canonical_term_ar, "ar"));
  const publishedGroups = [...new Set((adminData?.publishedCatalog || []).filter((item) => publishedType === "all" || item.section === publishedType).map((item) => item.group))].sort((a, b) => a.localeCompare(b, "ar"));
  const visiblePublished = (adminData?.publishedCatalog || []).filter((item) => (publishedType === "all" || item.section === publishedType) && (publishedGroup === "all" || item.group === publishedGroup) && (!publishedQuery.trim() || `${item.label} ${item.meta} ${item.group}`.toLocaleLowerCase("ar-IQ").includes(publishedQuery.trim().toLocaleLowerCase("ar-IQ"))));
  const queueEntityMap: Record<string,string> = { products:"products",brands:"brands",organizations:"organizations",offers:"offers",contents:"contents",origins:"origin_claims" };
  const qualityCandidateMap = new Map<string,{entity:string;id:string;label:string}>();
  for (const item of adminData?.publishedCatalog || []) qualityCandidateMap.set(`${item.entity}:${item.id}`, { entity:item.entity,id:item.id,label:item.label });
  for (const [queueKey,entity] of Object.entries(queueEntityMap)) for (const item of adminData?.queues[queueKey] || []) qualityCandidateMap.set(`${entity}:${item.id}`, { entity,id:item.id,label:item.label });
  const qualityRecordCandidates = [...qualityCandidateMap.values()].sort((a,b)=>a.label.localeCompare(b.label,"ar"));
  const checks = [
    ["اتصال قاعدة البيانات", status?.connected ? "متصل" : "قيد التحقق"],
    ["سوق الإطلاق", status?.launchMarket === "IQ-BGD" ? "بغداد" : "غير محدد"],
    ["الإطلاق العام", status?.publicLaunch ? "مفعّل" : "متوقف"],
    ["مكائن التحميص", status?.roastingMachines ? "ضمن V1" : "تحقق"],
    ["البن الأخضر", status?.greenCoffee ? "مفعّل" : "مؤجل"],
    [
      "الجهات المنشورة",
      directory.loading ? "جارٍ العد" : String(directory.organizations.length),
    ],
  ];
  const searchIntentLabels: Record<SearchIntent, string> = {
    broad: "بحث عام",
    product: "منتج",
    organization: "جهة",
    content: "معرفة",
    origin: "مصدر قهوة",
    unknown: "غير محدد",
  };
  const searchTypeLabels: Record<SearchEntityType, string> = {
    product: "المنتجات",
    organization: "الجهات",
    content: "المعرفة",
    origin: "المصادر",
  };
  const queueStatusLabels: Record<string, string> = { draft: "مسودة", in_review: "قيد المراجعة", submitted: "طلب جديد", needs_evidence: "بانتظار دليل إضافي", published: "منشور", rejected: "مرفوض", archived: "مؤرشف" };
  return (
    <div className="operations">
      <div className="operations-status-strip" aria-label="حالة النشر"><span className="operations-live-lock">حاجز النشر مفعّل</span></div>
      <section className="admin-review-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">CMS تشغيلي</span>
            <h2>طابور المراجعة والاعتماد</h2>
          </div>
          {adminState === "ready" && (
            <button
              type="button"
              onClick={async () => {
                await fetch("/api/admin/logout", { method: "POST" });
                setAdminState("signed_out");
                setAdminData(null);
              }}
            >
              تسجيل الخروج
            </button>
          )}
        </div>
        {adminState === "loading" && <p role="status">جارٍ فحص جلسة الإدارة…</p>}
        {adminState === "error" && (
          <div className="directory-state compact">
            <h3>تعذر تحميل لوحة الإدارة</h3>
            <p>لم يتغير أي سجل. أعد تحميل الصفحة وحاول مجدداً.</p>
          </div>
        )}
        {adminState === "signed_out" && (
          <form className="admin-login" onSubmit={login}>
            <b>الدخول بحساب مدير Supabase</b>
            <p>بيانات الدخول ترسل مباشرة عبر اتصال مشفر ولا تحفظ في الصفحة.</p>
            <label>
              البريد الإلكتروني
              <input name="email" type="email" autoComplete="username" required />
            </label>
            <label>
              كلمة المرور
              <input name="password" type="password" autoComplete="current-password" minLength={8} required />
            </label>
            <button className="primary" type="submit">دخول الإدارة</button>
          </form>
        )}
        {adminMessage && <p className="admin-message" role="status">{adminMessage}</p>}
        {adminState === "ready" && adminData && (
          <>
            <p className="admin-welcome">
              المستخدم: {adminData.profile.display_name || "فريق المنصة"} · الصلاحية: {({ editor: "مدخل بيانات", verifier: "مراجع ومعتمد", admin: "المدير الأعلى" } as Record<string,string>)[adminData.profile.role] || adminData.profile.role}.
            </p>
            <nav className="operations-workspace-nav" aria-label="أقسام مركز التشغيل">{[
              ["dashboard","نظرة عامة"],["records","إدارة السجلات"],["entry","إضافة سجل"],["review","المراجعة والاعتماد"],["partners","طلبات الجهات"],["media","الصور والملفات"],["imports","استيراد الجهات المشاركة"],["search","قاموس البحث"],["requests","الطلبات والمساعدة"],["archive","الأرشيف"],["taxonomy","التصنيفات والفلاتر"],
            ].filter(([value]) => value !== "taxonomy" || adminData.profile.role === "admin").map(([value,label]) => <button type="button" key={value} className={workspace === value ? "active" : ""} onClick={() => setWorkspace(value as typeof workspace)}>{label}</button>)}</nav>
            {workspace === "taxonomy" && adminData.profile.role === "admin" && <TaxonomyWorkspace />}
            {workspace === "dashboard" && <section className="operations-dashboard">
              <div className="operations-grid">{checks.map(([label, value]) => <article key={label}><span>{label}</span><b>{value}</b></article>)}</div>
              <div className="operations-health-grid"><article><span>بانتظار المراجعة</span><b>{adminData.qualityDesk.summary.recordsPendingReview}</b></article><article><span>ملاحظات جودة مفتوحة</span><b>{adminData.qualityDesk.summary.openIssues}</b></article><article><span>بطاقات بلا صور</span><b>{adminData.qualityDesk.summary.missingProductImages}</b></article><article><span>عروض بلا صور خاصة</span><b>{adminData.qualityDesk.summary.missingOfferImages}</b></article></div>
              <div className="workflow-lane"><span>مسودة</span><i>←</i><span>فحص النواقص</span><i>←</i><span>معاينة</span><i>←</i><span>مراجعة</span><i>←</i><span>اعتماد ونشر</span><i>←</i><span>تعديل أو أرشفة</span></div>
              <section className="quality-desk"><div className="section-head"><div><span className="eyebrow">قرار المالك مطلوب</span><h2>السجلات والملاحظات المشكوك فيها</h2></div><span>{adminData.qualityDesk.suspects.length}</span></div><p>كل ملاحظة قابلة للفتح والتدقيق. لا تختفي إلا بعد توثيق قرار المراجع أو المدير، ولا يُحذف سجلها من قاعدة البيانات.</p>{adminData.qualityDesk.suspects.map((item) => <article key={item.id}><div><span className={`quality-severity ${item.severity}`}>{item.severity}</span><b>{item.label}</b><small>{item.reason}{item.recommendedAction ? ` · المقترح: ${item.recommendedAction}` : ""}</small></div><div className="quality-item-actions">{item.issueDetails && <button type="button" onClick={()=>setQualityIssueEditor(item)}>عرض الملاحظة ومعالجتها</button>}{item.entityId && ["products","brands","organizations","offers","contents","origin_claims"].includes(item.entity) && <button type="button" onClick={() => setRecordEditor({ entity: item.entity, id: item.entityId! })}>فتح السجل دون تعديل تلقائي</button>}</div></article>)}</section>
            </section>}
            {workspace === "records" && <section className="published-records-admin priority-section" id="operations-published">
              <div className="section-head"><div><span className="eyebrow">القسم الأول · السجل الحي</span><h2>إدارة السجلات المنشورة</h2></div><span>{adminData.publishedCatalog.length} سجل</span></div>
              <p>التصفية هنا تستخدم فلسفة مركز الإدخال نفسها: عائلة السجل أولاً، ثم الفئة الدقيقة، ثم البحث بالاسم.</p>
              <div className="published-toolbar published-filter-grid">
                <label>قسم السجل<select value={publishedType} onChange={(event) => { setPublishedType(event.target.value); setPublishedGroup("all"); }}><option value="all">كل الأقسام</option><option value="coffee">قهوة محمصة</option><option value="equipment">معدات</option><option value="consumables">مستهلكات</option><option value="care">عناية وصيانة</option><option value="parts">قطع غيار</option><option value="directory">الدليل والجهات</option><option value="brands">العلامات التجارية</option><option value="offers">العروض والأسعار</option><option value="origins">مصادر القهوة</option><option value="learn">التعلم والمعرفة</option></select></label>
                <label>الفئة المتوافقة<select value={publishedGroup} onChange={(event) => setPublishedGroup(event.target.value)}><option value="all">كل فئات القسم</option>{publishedGroups.map((group) => <option value={group} key={group}>{group}</option>)}</select></label>
                <label>البحث داخل النتائج<input value={publishedQuery} onChange={(event) => setPublishedQuery(event.target.value)} placeholder="اسم السجل أو الفئة" /></label>
              </div>
              <div className="published-result-summary"><b>{visiblePublished.length.toLocaleString("ar-IQ")}</b><span>نتيجة مطابقة للفلاتر الحالية</span></div>
              <div className="published-record-list">{visiblePublished.slice(0, 200).map((item) => <article key={`${item.entity}-${item.id}`} className={`published-record-${item.entity}`}><div><span className="entity-kind-badge">{item.entity === "products" ? "بطاقة منتج رئيسية" : item.entity === "offers" ? "عرض بائع" : item.meta}</span><b>{item.label}</b><span>{item.group} · {item.meta} · المعرف {item.id} · آخر تحديث {new Date(item.updated_at).toLocaleDateString("ar-IQ")}</span></div><button type="button" onClick={() => setRecordEditor({ entity: item.entity, id: item.id })}>{item.entity === "products" ? "تعديل بطاقة المنتج" : item.entity === "offers" ? "تعديل عرض البائع" : "تعديل المنشور"}</button></article>)}{!visiblePublished.length && <p>لا توجد سجلات مطابقة.</p>}</div>
            </section>}
            {workspace === "partners" && <PartnerReviewQueue />}
            {workspace === "entry" && <DataCenter mode="entry" onChanged={loadAdmin} />}
            {workspace === "imports" && <DataCenter mode="imports" onChanged={loadAdmin} />}
            {workspace === "requests" && <SupportWorkspace data={adminData.supportWorkspace} canDelete={adminData.profile.role === "admin"} onUpdated={(result) => setAdminData((current) => current ? { ...current, queues: result.queues, searchGovernance: result.searchGovernance, supportWorkspace: result.supportWorkspace, publishedCatalog: result.publishedCatalog, inactiveCatalog: result.inactiveCatalog, qualityDesk: result.qualityDesk } : current)} />}
            {workspace === "review" && <div className="review-queues" id="operations-review">
              {[
                ["products", "المنتجات"],
                ["brands", "العلامات التجارية"],
                ["organizations", "الجهات"],
                ["offers", "العروض"],
                ["contents", "المحتوى"],
                ["origins", "مصادر القهوة"],
                ["beta", "ملاحظات الاختبار"],
                ["rights", "طلبات الحقوق"],
              ].filter(([key]) => (adminData.queues[key]?.length || 0) > 0).map(([key, label]) => (
                <section key={key}>
                  <h3>{label} <span>{adminData.queues[key]?.length || 0}</span></h3>
                  {key === "rights" && <p className="rights-workflow-note">«طلب دليل إضافي» يغيّر حالة الطلب ويثبتها في السجل. في MVP لا يرسل النظام بريداً تلقائياً؛ استخدم بيانات التواصل الظاهرة ثم أعد الطلب إلى «قيد المراجعة» عند وصول الدليل.</p>}
                  {adminData.queues[key].map((row) => (
                      <article key={row.id}>
                        <div>
                          <div className="queue-title">
                            <b>{row.label}</b>
                            <span className={row.ready ? "readiness ready" : "readiness blocked"}>
                              {row.ready ? "جاهز للاعتماد" : "غير جاهز"}
                            </span>
                          </div>
                          <span>{queueStatusLabels[row.status] || row.status} · {row.evidence}</span>
                          {row.blockers.length > 0 && (
                            <ul className="queue-notes blockers">
                              {row.blockers.map((note) => <li key={note}>{note}</li>)}
                            </ul>
                          )}
                          {row.warnings.length > 0 && (
                            <ul className="queue-notes warnings">
                              {row.warnings.map((note) => <li key={note}>{note}</li>)}
                            </ul>
                          )}
                        </div>
                        {key === "beta" && (
                          <div className="queue-actions">
                            {row.status === "new" && <button type="button" disabled={workingId === row.id} onClick={() => setReviewStatus("beta_feedback", row.id, "triaged")}>بدء المعالجة</button>}
                            {["triaged", "in_progress"].includes(row.status) && <button type="button" disabled={workingId === row.id} onClick={() => setReviewStatus("beta_feedback", row.id, "resolved")}>إغلاق بعد الإصلاح</button>}
                            <button type="button" disabled={workingId === row.id} onClick={() => setReviewStatus("beta_feedback", row.id, "duplicate")}>مكرر</button>
                          </div>
                        )}
                        {key === "support" && (
                          <div className="queue-actions">
                            {row.status === "new" && <button type="button" disabled={workingId === row.id} onClick={() => setReviewStatus("support_requests", row.id, "triaged")}>بدء المعالجة</button>}
                            {row.status === "triaged" && <button type="button" disabled={workingId === row.id} onClick={() => setReviewStatus("support_requests", row.id, "in_progress")}>قيد المتابعة</button>}
                            {["triaged", "in_progress"].includes(row.status) && <button type="button" disabled={workingId === row.id} onClick={() => setReviewStatus("support_requests", row.id, "waiting_user")}>بانتظار المستخدم</button>}
                            {!["resolved", "closed"].includes(row.status) && <button type="button" disabled={workingId === row.id} onClick={() => setReviewStatus("support_requests", row.id, "resolved")}>تم الحل</button>}
                            <button type="button" disabled={workingId === row.id} onClick={() => setReviewStatus("support_requests", row.id, "spam")}>مزعج</button>
                          </div>
                        )}
                        {key === "rights" && ["verifier","admin"].includes(adminData.profile.role) && <div className="queue-actions rights-actions">{row.status !== "in_review" && <button type="button" disabled={workingId===row.id} onClick={()=>processRightsRequest(row.id,"in_review")}>{row.status === "submitted" ? "بدء المراجعة" : "استئناف المراجعة بعد وصول الدليل"}</button>}{row.status !== "needs_evidence" && <button type="button" disabled={workingId===row.id} onClick={()=>processRightsRequest(row.id,"needs_evidence")}>طلب دليل إضافي</button>}{row.status === "in_review" && <><button type="button" disabled={workingId===row.id} onClick={()=>processRightsRequest(row.id,"approved")}>قبول وإغلاق</button><button type="button" disabled={workingId===row.id} onClick={()=>processRightsRequest(row.id,"rejected")}>رفض مع السبب</button></>}</div>}
                        {!["rights", "beta", "support"].includes(key) && (
                          <div className="queue-actions">
                            <button type="button" onClick={() => setRecordEditor({ entity: key === "origins" ? "origin_claims" : key, id: row.id })}>فتح وتدقيق</button>
                            {row.status === "draft" && (
                              <button type="button" disabled={workingId === row.id} onClick={() => setReviewStatus(key === "origins" ? "origin_claims" : key, row.id, "in_review")}>إرسال للمراجعة</button>
                            )}
                            {row.status === "in_review" && ["verifier","admin"].includes(adminData.profile.role) && (
                              <button
                                type="button"
                                disabled={workingId === row.id || !row.ready}
                                title={!row.ready ? "أغلق النواقص الظاهرة قبل النشر" : ""}
                                onClick={() => setReviewStatus(key === "origins" ? "origin_claims" : key, row.id, "published")}
                              >
                                اعتماد للنشر
                              </button>
                            )}
                            {row.status === "in_review" && !row.ready && adminData.profile.role === "admin" && <button type="button" className="admin-override" disabled={workingId === row.id} onClick={() => { const reason = window.prompt("اكتب سبب التجاوز الإداري بوضوح (10 أحرف على الأقل). سيُحفظ في سجل التدقيق:"); if (reason && reason.trim().length >= 10) setReviewStatus(key === "origins" ? "origin_claims" : key, row.id, "published", reason.trim()); }}>اعتماد إداري مع توثيق السبب</button>}
                            {["in_review", "rejected"].includes(row.status) && <button type="button" disabled={workingId === row.id} onClick={() => setReviewStatus(key === "origins" ? "origin_claims" : key, row.id, "draft")}>إعادة لمسودة</button>}
                            {["verifier","admin"].includes(adminData.profile.role) && <button
                              type="button"
                              disabled={workingId === row.id}
                              onClick={() => setReviewStatus(key === "origins" ? "origin_claims" : key, row.id, "rejected")}
                            >
                              رفض
                            </button>}
                            {row.status !== "published" && adminData.profile.role === "admin" && <button type="button" className="danger-action" disabled={workingId === row.id} onClick={() => deleteCatalogRecord(key === "origins" ? "origin_claims" : key, row.id, row.label)}>حذف نهائي</button>}
                          </div>
                        )}
                      </article>
                    ))}
                </section>
              ))}
            </div>}
            {workspace === "media" && <MediaLibrary onOpen={setRecordEditor} onUnauthorized={() => { setAdminData(null); setAdminState("signed_out"); }} />}
            {workspace === "archive" && <><section className="inactive-catalog"><div className="section-head"><div><span className="eyebrow">Archive</span><h2>المرفوضات والأرشيف</h2></div><span>{adminData.inactiveCatalog.length} سجل</span></div><p>الأرشفة هي الإجراء اليومي الآمن. الحذف النهائي متاح للمدير الأعلى فقط وبعد التأكيد.</p><div>{adminData.inactiveCatalog.map((item)=><article key={`${item.entity}-${item.id}`}><div><b>{item.label}</b><span>{item.status === "rejected" ? "مرفوض" : "مؤرشف"} · {new Date(item.updated_at).toLocaleDateString("ar-IQ")}</span></div><div className="queue-actions"><button type="button" onClick={()=>setRecordEditor({entity:item.entity,id:item.id})}>فتح وتعديل</button><button type="button" disabled={workingId===item.id} onClick={()=>setReviewStatus(item.entity,item.id,"draft")}>إعادة لمسودة</button>{adminData.profile.role === "admin" && <button type="button" className="danger-action" disabled={workingId===item.id} onClick={()=>deleteCatalogRecord(item.entity,item.id,item.label)}>حذف نهائي</button>}</div></article>)}{!adminData.inactiveCatalog.length && <p>لا توجد سجلات مؤرشفة أو مرفوضة حالياً.</p>}</div></section><ArchivedImportBatches /></>}
            {workspace === "search" && <div className="search-governance-disclosure" id="operations-search">
            <section className="search-governance-admin">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Search Governance V1</span>
                  <h2>قاموس البحث وجودة النتائج</h2>
                </div>
                <div className="search-governance-stats">
                  <span><b>{adminData.searchGovernance.activeTerms}</b> مصطلح فعال</span>
                  <span><b>{adminData.searchGovernance.draftTerms}</b> مسودة</span>
                  <span><b>{adminData.searchGovernance.totalEventsReviewed}</b> بحث محلل</span>
                </div>
              </div>
              <p>هذا القاموس يربط الكلمة بمرادفاتها ونوع النتائج المقصود. «درجة الأولوية» رقم من 1 إلى 100 لترتيب قاعدة البحث عند تعارض أكثر من مصطلح؛ ليست وزناً بالغم. القيمة المعتدلة الافتراضية 50.</p>
              <form className="search-term-form" onSubmit={createSearchTerm}>
                <label>المصطلح العربي<input name="canonicalTermAr" minLength={2} maxLength={120} required placeholder="مثال: مطحنة يدوية" /></label>
                <label>المصطلح الإنجليزي<input name="canonicalTermEn" maxLength={120} placeholder="Manual grinder" /></label>
                <label className="wide">المرادفات، مفصولة بفاصلة<input name="aliases" maxLength={1000} placeholder="طاحونة يدوية، hand grinder" /></label>
                <label>المقصد<select name="intent" defaultValue="product"><option value="broad">بحث عام</option><option value="product">منتج</option><option value="organization">جهة</option><option value="origin">مصدر قهوة</option><option value="content">معرفة</option></select></label>
                <label>طريقة المطابقة<select name="matchMode" defaultValue="contains"><option value="contains">تحتوي الكلمة</option><option value="exact">تطابق تام</option><option value="prefix">تبدأ بالكلمة</option></select></label>
                <label>درجة الأولوية (1–100)<input name="weight" type="number" min="1" max="100" defaultValue="50" required /><small>50 عادية، ارفعها فقط للمصطلحات الأهم.</small></label>
                <label>مصدر المصطلح<select name="sourceBasis" defaultValue="observed_query"><option value="observed_query">ظهر في بحث المستخدمين</option><option value="platform_decision">قرار تحريري للمنصة</option><option value="industry_reference">مرجع معتمد في القطاع</option></select></label>
                <fieldset className="search-scope">
                  <legend>الأقسام وترتيب الأولوية</legend>
                  <label><input type="checkbox" name="entityScope" value="product" defaultChecked /> المنتجات</label>
                  <label><input type="checkbox" name="entityScope" value="origin" /> المصادر</label>
                  <label><input type="checkbox" name="entityScope" value="content" /> المعرفة</label>
                  <label><input type="checkbox" name="entityScope" value="organization" /> الجهات</label>
                </fieldset>
                <button type="submit" disabled={workingId === "new-search-term"}>حفظ كمسودة</button>
              </form>
              <div className="search-term-toolbar"><div className="search-term-tabs">{(["active", "draft", "retired", "all"] as const).map((value) => <button type="button" key={value} className={searchTermView === value ? "active" : ""} onClick={() => setSearchTermView(value)}>{value === "active" ? "الفعالة" : value === "draft" ? "المسودات" : value === "retired" ? "المتوقفة" : "الكل"}</button>)}</div><label>بحث داخل القاموس<input value={searchTermQuery} onChange={(event) => setSearchTermQuery(event.target.value)} placeholder="مصطلح أو مرادف" /></label></div>
              <div className="arabic-letter-filter" aria-label="تصفية القاموس حسب الحرف"><button type="button" className={searchLetter === "all" ? "active" : ""} onClick={() => setSearchLetter("all")}>الكل</button>{arabicLetters.map((letter) => <button type="button" key={letter} className={searchLetter === letter ? "active" : ""} onClick={() => setSearchLetter(letter)}>{letter}</button>)}</div>
              <div className="search-term-list">
                {visibleSearchTerms.map((term) => (
                  editingSearchTermId === term.id ? <SearchTermEditForm key={term.id} term={term} onCancel={() => setEditingSearchTermId("")} onSaved={(result) => { setAdminData((current) => current ? { ...current, queues: result.queues, searchGovernance: result.searchGovernance, supportWorkspace: result.supportWorkspace, publishedCatalog: result.publishedCatalog, inactiveCatalog: result.inactiveCatalog } : current); setEditingSearchTermId(""); setAdminMessage("تم تعديل مصطلح البحث وتسجيل التغيير."); }} /> : <article key={term.id}>
                    <div>
                      <div className="queue-title"><b>{term.canonical_term_ar}</b><span className={`search-term-status ${term.status}`}>{term.status === "active" ? "فعال" : term.status === "draft" ? "مسودة" : "متقاعد"}</span></div>
                      <p>{term.canonical_term_en || "—"} · {searchIntentLabels[term.intent]} · أولوية {term.weight}/100</p>
                      <small>المرادفات: {term.aliases.join("، ") || "لا توجد"}</small>
                      <small>النطاق: {term.entity_scope.map((type) => searchTypeLabels[type]).join(" ← ")}</small>
                    </div>
                    <div className="queue-actions">
                      <button type="button" onClick={() => setEditingSearchTermId(term.id)}>تعديل</button>
                      {term.status !== "active" && <button type="button" disabled={workingId === term.id} onClick={() => setSearchTermStatus(term.id, "active")}>تفعيل</button>}
                      {term.status === "active" && <button type="button" disabled={workingId === term.id} onClick={() => setSearchTermStatus(term.id, "retired")}>إيقاف</button>}
                      {term.status === "retired" && <button type="button" disabled={workingId === term.id} onClick={() => setSearchTermStatus(term.id, "draft")}>إعادة لمسودة</button>}
                      {term.status !== "active" && <button type="button" className="danger-action" disabled={workingId === term.id} onClick={() => deleteSearchTerm(term.id)}>حذف</button>}
                    </div>
                  </article>
                ))}
                {!visibleSearchTerms.length && <p>لا توجد مصطلحات مطابقة في هذا التبويب.</p>}
              </div>
              <div className="weak-query-report">
                <h3>كلمات تحتاج إلى معالجة <span>{adminData.searchGovernance.weakQueries.length}</span></h3>
                {adminData.searchGovernance.weakQueries.length ? (
                  <div className="weak-query-table" role="table" aria-label="الكلمات ذات النتائج الضعيفة">
                    <div role="row" className="head"><span>الكلمة</span><span>المقصد</span><span>بلا نتائج</span><span>نتيجة واحدة</span></div>
                    {adminData.searchGovernance.weakQueries.map((gap) => (
                      <div role="row" key={gap.query}><b>{gap.query}</b><span>{searchIntentLabels[gap.inferredIntent]}</span><span>{gap.zeroResults}</span><span>{gap.lowResults}</span></div>
                    ))}
                  </div>
                ) : <p>لا توجد كلمات ضعيفة مسجلة بعد. ستظهر هنا تلقائياً بعد الاختبارات.</p>}
              </div>
            </section>
            </div>}
            {qualityIssueEditor && <QualityIssueEditor issue={qualityIssueEditor} candidates={qualityRecordCandidates} canDecide={adminData.profile.role !== "editor"} onClose={()=>setQualityIssueEditor(null)} onUpdated={(data)=>{setAdminData((current)=>current?{...current,queues:data.queues,searchGovernance:data.searchGovernance,supportWorkspace:data.supportWorkspace,publishedCatalog:data.publishedCatalog,inactiveCatalog:data.inactiveCatalog,qualityDesk:data.qualityDesk}:current);setAdminMessage("تم حفظ قرار ملاحظة الجودة وتوثيقه في سجل التدقيق.");}} />}
            {recordEditor && <ReviewRecordEditor entity={recordEditor.entity} id={recordEditor.id} canRestore={adminData.profile.role !== "editor"} onClose={() => setRecordEditor(null)} onSaved={loadAdmin} />}
          </>
        )}
      </section>
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
  else if (page.kind === "operations") body = <Operations />;
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
        {!(["home", "operations"] as string[]).includes(page.kind) && (
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
