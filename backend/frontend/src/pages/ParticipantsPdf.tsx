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
  family: "Helvetica",
  fonts: [{ src: "Helvetica" }],
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "bold",
  },
  infoBox: {
    marginBottom: 15,
    padding: 10,
    border: "1px solid #ddd",
  },
  infoText: {
    marginBottom: 5,
    textAlign: "right",
  },
  table: {
    width: "100%",
    border: "1px solid #ccc",
  },
  row: {
    flexDirection: "row-reverse",
  },
  headerCell: {
    flex: 1,
    padding: 6,
    borderLeft: "1px solid #ccc",
    backgroundColor: "#eeeeee",
    fontWeight: "bold",
    textAlign: "center",
  },
  cell: {
    flex: 1,
    padding: 6,
    borderTop: "1px solid #ccc",
    borderLeft: "1px solid #ccc",
    textAlign: "center",
  },
});

const ParticipantsPdf = ({ event, participants }: any) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>لائحة المشاركين</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>اسم النشاط : {event?.title}</Text>
        <Text style={styles.infoText}>التاريخ : {event?.startDate} إلى {event?.endDate}</Text>
        <Text style={styles.infoText}>المكان : {event?.place || "غير محدد"}</Text>
      </View>

      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={styles.headerCell}>الاسم</Text>
          <Text style={styles.headerCell}>اللقب</Text>
          <Text style={styles.headerCell}>الحضور</Text>
          <Text style={styles.headerCell}>سبب الغياب</Text>
        </View>

        {participants.map((p: any, index: number) => (
          <View style={styles.row} key={index}>
            <Text style={styles.cell}>{p.nom}</Text>
            <Text style={styles.cell}>{p.prenom}</Text>
            <Text style={styles.cell}>{p.present === false ? "لا" : "نعم"}</Text>
            <Text style={styles.cell}>{p.motif || ""}</Text>
          </View>
        ))}
      </View>

      <Text style={{ marginTop: 15, textAlign: "right" }}>
        عدد المشاركين : {participants.length}
      </Text>
    </Page>
  </Document>
);

export default ParticipantsPdf;