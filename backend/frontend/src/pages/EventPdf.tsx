import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { ParticipantRow } from "./ParticipantsPdf";

Font.register({
  family: "Amiri",
  fonts: [
    { src: "/fonts/Amiri-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Amiri-Bold.ttf", fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

interface EventFile {
  base64: string;
  type: string;
  name: string;
}

interface EventPdfProps {
  event: any;
  description: string; // HTML de l'éditeur
  rows: ParticipantRow[];
  files: EventFile[];
  typeMontant: "GLOBAL" | "DISTRIBUE";
  modeRepartition: "EGAL" | "DEGRE";
  montantGlobal: number;
  montantEgal: number;
  montantTotal: number;
  montantsParDegre: Record<number, number>;
}

const COLORS = {
  primary: "#1e3a8a",
  accent: "#2563eb",
  border: "#cbd5e1",
  headBg: "#e5e7eb",
  cardBg: "#f8fafc",
  zebra: "#f8fafc",
  green: "#15803d",
  red: "#b91c1c",
  text: "#1f2937",
  muted: "#6b7280",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Amiri",
    fontSize: 10.5,
    padding: 28,
    paddingBottom: 46,
    color: COLORS.text,
  },

  header: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
    paddingBottom: 10,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 700,
    textAlign: "center",
    color: COLORS.primary,
  },
  headerSub: {
    marginTop: 4,
    fontSize: 14,
    textAlign: "center",
    color: COLORS.muted,
  },
h1: { fontSize: 17, fontWeight: 700, marginTop: 5, marginBottom: 4 },
quote: {
  borderRightWidth: 3,
  borderRightColor: COLORS.accent,
  paddingRight: 8,
  marginVertical: 3,
  color: COLORS.muted,
  lineHeight: 1.5,
},
hr: { borderBottomWidth: 1, borderBottomColor: COLORS.border, marginVertical: 6 },
  section: { marginBottom: 16 },
  sectionHead: {
    borderRightWidth: 4,
    borderRightColor: COLORS.accent,
    paddingRight: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.primary,
    textAlign: "right",
  },

  grid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "49%",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBg,
    borderRadius: 6,
    padding: 7,
    marginBottom: 6,
  },
  cardFull: { width: "100%" },
  cardLabel: {
    fontSize: 8.5,
    color: COLORS.muted,
    textAlign: "right",
    marginBottom: 2,
  },
  cardValue: { fontSize: 11, fontWeight: 700, textAlign: "right" },

  chips: { flexDirection: "row-reverse", flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderColor: "#fde68a",
    backgroundColor: "#fffbeb",
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginLeft: 4,
    marginBottom: 3,
  },

  description: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#f9fafb",
    borderRadius: 6,
    padding: 10,
  },
  h2: { fontSize: 14, fontWeight: 700, marginTop: 4, marginBottom: 3 },
  h3: { fontSize: 12, fontWeight: 700, marginTop: 3, marginBottom: 2 },
  p: { lineHeight: 1.5, marginBottom: 3 },
  li: { flexDirection: "row-reverse", marginBottom: 2 },
  liMark: { width: 14, textAlign: "right" },
  liText: { flex: 1, lineHeight: 1.5 },

  statsRow: { flexDirection: "row-reverse", marginTop: 4 },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 6,
    marginLeft: 6,
    alignItems: "center",
  },
  statValue: { fontSize: 15, fontWeight: 700 },
  statLabel: { fontSize: 9, color: COLORS.muted },

  tableHead: {
    flexDirection: "row-reverse",
    backgroundColor: COLORS.headBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: {
    flexDirection: "row-reverse",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  cell: {
    padding: 4,
    textAlign: "center",
    borderLeftWidth: 1,
    borderColor: COLORS.border,
    fontSize: 10,
  },
  headCell: { fontWeight: 700 },
  cIndex: { width: "5%" },
  cType: { width: "10%" },
  cNom: { width: "25%" },
  cDegre: { width: "9%" },
  cMontant: { width: "14%" },
  cPresence: { width: "10%" },
  cMotif: { width: "27%" },

  totalBox: {
    marginTop: 8,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },

  imageGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  imageBox: { width: "49%", marginBottom: 8 },
  image: {
    width: "100%",
    height: 150,
    objectFit: "cover",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imageName: {
    marginTop: 3,
    fontSize: 8,
    textAlign: "center",
    color: COLORS.muted,
  },

  fileRow: { flexDirection: "row-reverse", alignItems: "center", marginBottom: 4 },

  footer: {
    position: "absolute",
    bottom: 18,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: COLORS.muted,
  },
});

/* ============ Petits composants ============ */

/** Plusieurs morceaux de texte sur une ligne RTL (le 1er est à droite). */
const Line: React.FC<{ parts: string[]; style?: any }> = ({ parts, style }) => (
  <View style={{ flexDirection: "row-reverse" }}>
    {parts.map((t, i) => (
      <Text key={i} style={[style || {}, { marginLeft: 3 }]}>
        {t}
      </Text>
    ))}
  </View>
);

const Field: React.FC<{ label: string; value: string; bold?: boolean }> = ({
  label,
  value,
  bold,
}) => (
  <View style={{ flexDirection: "row-reverse", alignItems: "center" }}>
    <Text style={{ fontWeight: 700 }}>{label}</Text>
    <Text style={{ marginHorizontal: 3, fontWeight: 700 }}>:</Text>
    <Text style={bold ? { fontWeight: 700 } : {}}>{value}</Text>
  </View>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View style={styles.section}>
    <View style={styles.sectionHead} minPresenceAhead={120}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const Card: React.FC<{
  label: string;
  value?: string;
  full?: boolean;
  children?: React.ReactNode;
}> = ({ label, value, full, children }) => (
  <View style={[styles.card, full ? styles.cardFull : {}]} wrap={false}>
    <Text style={styles.cardLabel}>{label}</Text>
    {children ?? <Text style={styles.cardValue}>{value || "-"}</Text>}
  </View>
);
type Run = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  bg?: string;
};

type Block = {
  kind: "h1" | "h2" | "h3" | "p" | "li" | "quote" | "hr";
  runs: Run[];
  align: "right" | "center" | "left" | "justify";
  mark?: string;
  depth?: number;
};

// rgb(255, 0, 0) -> #ff0000 (plus fiable pour react-pdf)
const toHex = (c?: string) => {
  if (!c) return undefined;
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return c;
  return (
    "#" +
    [m[1], m[2], m[3]]
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")
  );
};

const collectRuns = (node: Node, style: Omit<Run, "text">, out: Run[]) => {
  if (node.nodeType === 3) {
    const t = (node.textContent || "").replace(/\s+/g, " ");
    if (t) out.push({ text: t, ...style });
    return;
  }
  if (node.nodeType !== 1) return;

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();

  if (tag === "ul" || tag === "ol") return; // gérées à part (listes imbriquées)
  if (tag === "br") {
    out.push({ text: "\n", ...style });
    return;
  }

  const next = { ...style };
  if (tag === "strong" || tag === "b") next.bold = true;
  if (tag === "em" || tag === "i") next.italic = true;
  if (tag === "u") next.underline = true;
  if (tag === "s" || tag === "strike" || tag === "del") next.strike = true;
  if (tag === "mark") next.bg = toHex(el.style?.backgroundColor) || "#fef08a";
  if (tag === "a") {
    next.color = "#2563eb";
    next.underline = true;
  }
  if (el.style?.color) next.color = toHex(el.style.color);
  if (el.style?.fontWeight === "bold" || Number(el.style?.fontWeight) >= 600)
    next.bold = true;

  el.childNodes.forEach((c) => collectRuns(c, next, out));
};

const hasText = (runs: Run[]) => runs.some((r) => r.text.trim());

const alignOf = (el: HTMLElement): Block["align"] => {
  const a = el.style?.textAlign;
  return a === "center" || a === "left" || a === "justify" ? a : "right";
};

const walk = (parent: Element, out: Block[], depth = 0, inQuote = false) => {
  Array.from(parent.children).forEach((child) => {
    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "ul" || tag === "ol") {
      Array.from(el.children).forEach((li, i) => {
        const runs: Run[] = [];
        collectRuns(li, {}, runs);
        if (hasText(runs)) {
          out.push({
            kind: "li",
            runs,
            align: alignOf(li as HTMLElement),
            mark: tag === "ol" ? `${i + 1}.` : depth > 0 ? "◦" : "•",
            depth,
          });
        }
        walk(li, out, depth + 1); // sous-listes
      });
      return;
    }

    if (tag === "blockquote") {
      walk(el, out, depth, true);
      return;
    }

    if (tag === "hr") {
      out.push({ kind: "hr", runs: [], align: "right" });
      return;
    }

    const runs: Run[] = [];
    collectRuns(el, {}, runs);

    if (!hasText(runs)) {
      if (tag === "p") out.push({ kind: "p", runs: [{ text: " " }], align: "right" });
      return;
    }

    const kind: Block["kind"] = inQuote
      ? "quote"
      : tag === "h1"
      ? "h1"
      : tag === "h2"
      ? "h2"
      : tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6"
      ? "h3"
      : "p";

    out.push({ kind, runs, align: alignOf(el) });
  });
};

const htmlToBlocks = (html: string): Block[] => {
  if (!html || typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: Block[] = [];
  walk(doc.body, out);
  return out;
};

const renderRuns = (runs: Run[]) =>
  runs.map((r, i) => (
    <Text
      key={i}
      style={{
        fontWeight: r.bold ? 700 : 400,
        fontStyle: r.italic ? "italic" : "normal",
        textDecoration:
          r.underline && r.strike
            ? "underline line-through"
            : r.underline
            ? "underline"
            : r.strike
            ? "line-through"
            : "none",
        ...(r.color ? { color: r.color } : {}),
        ...(r.bg ? { backgroundColor: r.bg } : {}),
      }}
    >
      {r.text}
    </Text>
  ));

/* ============ Utilitaires ============ */

const cibleLabel = (c: string) =>
  c === "MERE" ? "أم" : c === "ENFANT" ? "طفل" : c === "FAMILLE" ? "عائلة" : c;

const fileTypeLabel = (type?: string) => {
  if (!type) return "ملف";
  if (type.startsWith("image/")) return "صورة";
  if (type === "application/pdf") return "PDF";
  if (type.includes("word")) return "Word";
  if (type.includes("excel") || type.includes("spreadsheet")) return "Excel";
  return "ملف";
};

// react-pdf ne sait afficher que JPEG et PNG (pas WebP)
const isRenderableImage = (f: EventFile) =>
  f.type === "image/jpeg" || f.type === "image/png";

/* ============ Document ============ */

const EventPdf: React.FC<EventPdfProps> = ({
  event,
  description,
  rows,
  files,
  typeMontant,
  modeRepartition,
  montantGlobal,
  montantEgal,
  montantTotal,
  montantsParDegre,
}) => {
  const blocks = htmlToBlocks(description);

  const images = files.filter(isRenderableImage);
  const otherFiles = files.filter((f) => !isRenderableImage(f));

  const presents = rows.filter((r) => r.present).length;
  const absents = rows.length - presents;

  const cibles: string[] = event.cibles || [];
  const showAge =
    cibles.includes("ENFANT") && (event.ageMin != null || event.ageMax != null);

  const agePartsList: string[] = [];
  if (event.ageMin != null) agePartsList.push("من", String(event.ageMin));
  if (event.ageMax != null) agePartsList.push("إلى", String(event.ageMax));
  agePartsList.push("سنة");

  const degreEntries = Object.entries(montantsParDegre || {}).sort(
    (a, b) => Number(a[0]) - Number(b[0])
  );

  return (
    <Document title={`تقرير النشاط - ${event.title}`}>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* ============ EN-TÊTE ============ */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>تقرير النشاط</Text>
          <Text style={styles.headerSub}>{event.title || "-"}</Text>
        </View>

        {/* ============ INFORMATIONS ============ */}
        <Section title="معلومات النشاط">
          <View style={styles.grid}>
            <Card label="عنوان النشاط" value={event.title} />
            <Card label="نوع النشاط" value={event.eventType?.name} />
            <Card label="المكان" value={event.place || "غير محدد"} />
            <Card
              label="الفئة المستهدفة"
              value={cibles.map(cibleLabel).join(" - ")}
            />
            <Card label="تاريخ البداية" value={event.startDate} />
            <Card label="تاريخ النهاية" value={event.endDate} />

            {event.degresFamille?.length > 0 && (
              <Card label="درجة العائلة المستهدفة" full>
                <View style={styles.chips}>
                  {event.degresFamille.map((d: number) => (
                    <View key={d} style={styles.chip}>
                      <Line
                        parts={["الدرجة", String(d)]}
                        style={{ fontWeight: 700, color: "#b45309" }}
                      />
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {showAge && (
              <Card label="الفئة العمرية المستهدفة" full>
                <Line parts={agePartsList} style={styles.cardValue} />
              </Card>
            )}
          </View>
        </Section>

     <Section title="وصف النشاط">
       <View style={styles.description}>
         {blocks.length === 0 ? (
           <Text style={{ textAlign: "right", color: COLORS.muted }}>
             لا يوجد وصف
           </Text>
         ) : (
           blocks.map((b, i) => {
             if (b.kind === "hr") return <View key={i} style={styles.hr} />;

             if (b.kind === "li") {
               return (
                 <View
                   key={i}
                   style={[styles.li, { marginRight: (b.depth || 0) * 14 }]}
                 >
                   <Text style={styles.liMark}>{b.mark}</Text>
                   <Text style={[styles.liText, { textAlign: b.align }]}>
                     {renderRuns(b.runs)}
                   </Text>
                 </View>
               );
             }

             const base =
               b.kind === "h1"
                 ? styles.h1
                 : b.kind === "h2"
                 ? styles.h2
                 : b.kind === "h3"
                 ? styles.h3
                 : b.kind === "quote"
                 ? styles.quote
                 : styles.p;

             return (
               <Text key={i} style={[base, { textAlign: b.align }]}>
                 {renderRuns(b.runs)}
               </Text>
             );
           })
         )}
       </View>
     </Section>
        {/* ============ FINANCES + STATISTIQUES ============ */}
        <Section title="المعلومات المالية والإحصائيات">
          <View style={styles.grid}>
            <Card
              label="طريقة احتساب المبلغ"
              value={
                typeMontant === "GLOBAL"
                  ? "مبلغ إجمالي للنشاط"
                  : "توزيع المبلغ على المستفيدين"
              }
            />

            {typeMontant === "GLOBAL" ? (
              <Card
                label="المبلغ الإجمالي"
                value={`${Number(montantGlobal || 0).toFixed(2)} DH`}
              />
            ) : (
              <Card
                label="طريقة التوزيع"
                value={
                  modeRepartition === "EGAL"
                    ? "مبلغ متساوٍ لكل مستفيد"
                    : "حسب درجة العائلة"
                }
              />
            )}

            {typeMontant === "DISTRIBUE" && modeRepartition === "EGAL" && (
              <Card
                label="المبلغ لكل مستفيد"
                value={`${Number(montantEgal || 0).toFixed(2)} DH`}
              />
            )}

            {typeMontant === "DISTRIBUE" &&
              modeRepartition === "DEGRE" &&
              degreEntries.map(([degre, montant]) => (
                <Card
                  key={degre}
                  label={`الدرجة ${degre}`}
                  value={`${Number(montant || 0).toFixed(2)} DH`}
                />
              ))}
          </View>

          <View style={styles.statsRow} wrap={false}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{rows.length}</Text>
              <Text style={styles.statLabel}>عدد المشاركين</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: COLORS.green }]}>
                {presents}
              </Text>
              <Text style={styles.statLabel}>الحاضرون</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: COLORS.red }]}>
                {absents}
              </Text>
              <Text style={styles.statLabel}>الغائبون</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: COLORS.primary }]}>
                {Number(montantTotal || 0).toFixed(2)} DH
              </Text>
              <Text style={styles.statLabel}>المجموع الكلي</Text>
            </View>
          </View>
        </Section>

        {/* ============ PARTICIPANTS ============ */}
        <Section title="قائمة المشاركين">
          {rows.length === 0 ? (
            <Text style={{ textAlign: "right", color: COLORS.muted }}>
              لا يوجد مشاركون
            </Text>
          ) : (
            <View>
            <View style={styles.tableHead} wrap={false} minPresenceAhead={60}>
                <Text style={[styles.cell, styles.headCell, styles.cIndex]}>#</Text>
                <Text style={[styles.cell, styles.headCell, styles.cType]}>النوع</Text>
                <Text style={[styles.cell, styles.headCell, styles.cNom]}>الاسم</Text>
                <Text style={[styles.cell, styles.headCell, styles.cDegre]}>الدرجة</Text>
                <Text style={[styles.cell, styles.headCell, styles.cMontant]}>المبلغ</Text>
                <Text style={[styles.cell, styles.headCell, styles.cPresence]}>الحضور</Text>
                <Text style={[styles.cell, styles.headCell, styles.cMotif]}>سبب الغياب</Text>
              </View>

              {rows.map((r, i) => (
                <View
                  key={i}
                  wrap={false}
                  style={[
                    styles.row,
                    { backgroundColor: i % 2 ? COLORS.zebra : "#ffffff" },
                  ]}
                >
                  <Text style={[styles.cell, styles.cIndex]}>{i + 1}</Text>
                  <Text style={[styles.cell, styles.cType]}>{r.typeLabel || "-"}</Text>

                  <View
                    style={[
                      styles.cell,
                      styles.cNom,
                      {
                        flexDirection: "row-reverse",
                        justifyContent: "center",
                        alignItems: "center",
                      },
                    ]}
                  >
                    {r.prefixe ? (
                      <Text style={{ marginLeft: 4 }}>{r.prefixe}</Text>
                    ) : null}
                    <Text>{r.nomComplet || "-"}</Text>
                  </View>

                  <Text style={[styles.cell, styles.cDegre]}>{r.degre}</Text>
                  <Text style={[styles.cell, styles.cMontant]}>{r.montant}</Text>
                  <Text
                    style={[
                      styles.cell,
                      styles.cPresence,
                      {
                        color: r.present ? COLORS.green : COLORS.red,
                        fontWeight: 700,
                      },
                    ]}
                  >
                    {r.present ? "نعم" : "لا"}
                  </Text>
                  <Text style={[styles.cell, styles.cMotif]}>
                    {r.present ? "-" : r.motif || "-"}
                  </Text>
                </View>
              ))}

              <View style={styles.totalBox} wrap={false}>
                <Field
                  label="المجموع الكلي"
                  value={`${Number(montantTotal || 0).toFixed(2)} DH`}
                  bold
                />
                <Field
                  label="العدد الإجمالي للمشاركين"
                  value={String(rows.length)}
                  bold
                />
              </View>
            </View>
          )}
        </Section>

        {/* ============ IMAGES ============ */}
        {images.length > 0 && (
          <Section title="صور النشاط">
            <View style={styles.imageGrid}>
              {images.map((file, i) => (
                <View key={i} style={styles.imageBox} wrap={false}>
                  <Image src={file.base64} style={styles.image} />
                  <Text style={styles.imageName}>
                    {file.name || `صورة ${i + 1}`}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* ============ AUTRES FICHIERS ============ */}
        {otherFiles.length > 0 && (
          <Section title="الملفات المرفقة">
            {otherFiles.map((file, i) => (
              <View key={i} style={styles.fileRow} wrap={false}>
                <Text style={{ marginLeft: 5 }}>•</Text>
                <Text style={{ marginLeft: 6 }}>{file.name || `ملف ${i + 1}`}</Text>
                <Text style={{ fontSize: 9, color: COLORS.muted }}>
                  {fileTypeLabel(file.type)}
                </Text>
              </View>
            ))}
          </Section>
        )}

        {/* ============ PIED DE PAGE ============ */}
        <View style={styles.footer} fixed>
          <Text
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
          <Text>{event.title}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default EventPdf;