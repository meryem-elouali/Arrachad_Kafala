import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

Font.register({
  family: "Amiri",
  fonts: [
    { src: "/fonts/Amiri-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Amiri-Bold.ttf", fontWeight: 700 },
  ],
});

// Évite la coupure des mots arabes
Font.registerHyphenationCallback((word) => [word]);

export interface ParticipantRow {
  prefixe?: string;   // "عائلة" pour une famille, sinon vide
  nomComplet: string;
  degre: string;
  montant: string;
  present: boolean;
  motif: string;
}
interface Props {
  title: string;
  startDate: string;
  endDate: string;
  place: string;
  rows: ParticipantRow[];
  montantTotal: string;
  showMontant: boolean;
}

const COLORS = {
  primary: "#1e3a8a",
  border: "#cbd5e1",
  headBg: "#e5e7eb",
  zebra: "#f8fafc",
  green: "#15803d",
  red: "#b91c1c",
  text: "#1f2937",
  muted: "#6b7280",
};
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
const styles = StyleSheet.create({
  page: {
    fontFamily: "Amiri",
    fontSize: 11,
    padding: 28,
    paddingBottom: 46,
    color: COLORS.text,
  },
 titleRow: {
   flexDirection: "row-reverse",
   justifyContent: "center",
   alignItems: "center",
   marginBottom: 14,
 },
 titleText: {
   fontSize: 22,
   fontWeight: 700,
   color: COLORS.primary,
 },
  infoBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    padding: 10,
    marginBottom: 14,
    flexDirection: "row-reverse",
    flexWrap: "wrap",
  },
  infoItem: {
    width: "50%",
    flexDirection: "row-reverse",
    marginBottom: 4,
  },
  infoLabel: { fontWeight: 700, marginLeft: 4 },
  statsRow: {
    flexDirection: "row-reverse",
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    padding: 6,
    marginLeft: 6,
    alignItems: "center",
  },
  statValue: { fontSize: 16, fontWeight: 700 },
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
    padding: 5,
    textAlign: "center",
    borderLeftWidth: 1,
    borderColor: COLORS.border,
  },
  headCell: { fontWeight: 700 },

cIndex: { width: "6%" },
cNom: { width: "28%" },
cDegre: { width: "12%" },
cMontant: { width: "16%" },
cPresence: { width: "12%" },
cMotif: { width: "26%" },

  totalBox: {
    marginTop: 12,
    flexDirection: "row-reverse",
    justifyContent: "space-between",

  },
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

const ParticipantsPdf: React.FC<Props> = ({
  title,
  startDate,
  endDate,
  place,
  rows,
  montantTotal,
  showMontant,
}) => {
  const presents = rows.filter((r) => r.present).length;
  const absents = rows.length - presents;

  return (
    <Document title={`لائحة المشاركين - ${title}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
    <View style={styles.titleRow}>
      <Text style={styles.titleText}>لائحة المشاركين في</Text>
      <Text style={[styles.titleText, { marginRight: 10 }]}>
        {title || "-"}
      </Text>
    </View>

        {/* Infos activité */}
       <View style={styles.infoBox}>
         <View style={styles.infoItem}>
           <Field label="اسم النشاط" value={title || "-"} />
         </View>
         <View style={styles.infoItem}>
           <Field label="المكان" value={place || "غير محدد"} />
         </View>
         <View style={styles.infoItem}>
           <Field label="من" value={startDate || "-"} />
         </View>
         <View style={styles.infoItem}>
           <Field label="إلى" value={endDate || "-"} />
         </View>
       </View>

        {/* Statistiques */}
        <View style={styles.statsRow}>
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
        </View>

        {/* En-tête du tableau (répétée à chaque page) */}
    <View style={styles.tableHead} fixed>
      <Text style={[styles.cell, styles.headCell, styles.cIndex]}>#</Text>
      <Text style={[styles.cell, styles.headCell, styles.cNom]}>الاسم</Text>
      <Text style={[styles.cell, styles.headCell, styles.cDegre]}>الدرجة</Text>
      <Text style={[styles.cell, styles.headCell, styles.cMontant]}>المبلغ</Text>
      <Text style={[styles.cell, styles.headCell, styles.cPresence]}>الحضور</Text>
      <Text style={[styles.cell, styles.headCell, styles.cMotif]}>سبب الغياب</Text>
    </View>

        {/* Lignes */}
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

       {showMontant && (
         <View style={styles.totalBox}>
           <Field label="المجموع الكلي" value={montantTotal} bold />
           <Field label="العدد الإجمالي للمشاركين" value={String(rows.length)} bold />
         </View>
       )}

        {/* Pied de page */}
        <View style={styles.footer} fixed>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
          <Text>{title}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default ParticipantsPdf;