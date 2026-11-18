import photoManifest from "./cdcAwardOfficialPhotos.json";

export type CdcOfficialAwardRecipient = {
  name: string;
  award: string;
  photo?: string;
  representative?: string;
};

export type CdcOfficialAwardGroup = {
  key: string;
  title: string;
  recipients: CdcOfficialAwardRecipient[];
};

const photoBySource = new Map(photoManifest.map((item) => [item.source, item.src]));

function recipient(
  name: string,
  award: string,
  photoSource: string,
  representative?: string,
): CdcOfficialAwardRecipient {
  const photo = photoBySource.get(photoSource);
  if (!photo) throw new Error(`Missing CDC awards photo: ${photoSource}`);
  return { name, award, photo, representative };
}

export const cdcOfficialAwardGroups: CdcOfficialAwardGroup[] = [
  {
    key: "service-awards",
    title: "Chess service awards",
    recipients: [
      recipient("Elias Mabotja", "Outstanding Administrator of the Year", "outstanding adminstrator of the year.jpg"),
      recipient("Tumelo Mmola", "2nd Outstanding Administrator of the Year", "2nd outstanding administrator of the year.jpg"),
      recipient("Willie Swanepoel", "3rd Outstanding Administrator of the Year", "3rd outstanding administrator of the year.jpg"),
      recipient("Elias Mabotja", "Outstanding Arbiter of the Year", "outstanding arbiter of the year.jpg"),
      recipient("Tumelo Mmola", "2nd Outstanding Arbiter of the Year", "2nd outstanding arbiter of the year.jpg"),
      recipient("Kobus Verreynne", "3rd Outstanding Arbiter of the Year", "3rd outstanding arbiter of the year.jpg"),
      recipient("Tumelo Mmola", "Outstanding Upcoming Arbiter of the Year", "outstanding upcoming  arbiter of the year.jpg"),
      recipient("Tumelo Mmola", "Coach of the Year", "coach of the year.jpg"),
      recipient("Anna Chipape", "2nd Outstanding Coach of the Year", "2nd outstanding coach of the year.jpg"),
      recipient("Mohololo Nkoana", "3rd Outstanding Coach of the Year", "3rd outstanding coach of the year.jpg"),
      recipient("Elias Mabotja", "Outstanding Organiser of the Year", "outstanding organiser of the year.jpg"),
      recipient("Tumelo Mmola", "2nd Outstanding Organiser of the Year", "2nd outstanding organiser of the year.jpg"),
      recipient("Malope Disele", "Outstanding Scorekeeper of the Year", "outstanding scorekeeper of the year.jpg"),
      recipient("Gladys Mokgehle", "2nd Outstanding Scorekeeper of the Year", "2nd outstanding scorekeeper of the year.jpg"),
      recipient("Abigail Ralefeta", "3rd Outstanding Scorekeeper of the Year", "3rd outstanding scorekeeper of the year.jpg"),
      recipient("Elias Mabotja", "Outstanding Team Manager of the Year", "outstanding team manager of the year.jpg"),
      recipient("Malope Disele", "2nd Outstanding Team Manager of the Year", "2nd outstanding team manager of the year.jpg"),
      recipient("Thapelo Sindani", "3rd Outstanding Team Manager of the Year", "3rd outstanding manager of the year.jpg"),
      recipient("Thapelo Sindani", "Upcoming Manager of the Year", "upcoming manager of the year.jpg"),
    ],
  },
  {
    key: "team-awards",
    title: "Team and organisational awards",
    recipients: [
      recipient("Northern Academy Secondary School", "High School Team of the Year", "Mogodi Morongwa-outstanding high chool.jpg", "Mogodi Morongwa"),
      recipient("PEPPS", "2nd Outstanding High School Team of the Year", "Mushweu Gundo-2nd high school.jpg", "Mushweu Gundo"),
      recipient("Tom Naude", "3rd High School Team of the Year", "joe mahomole- 3rd high school team of the year.jpg", "Joe Mahomole"),
      recipient("Dendron Primary School", "Primary School Team of the Year", "primary school team of the year.jpg"),
      recipient("PEMPS", "2nd Outstanding Primary School Team of the Year", "2nd outstanding primary school team of the year.jpg"),
      recipient("Flora Park Comprehensive Primary School", "3rd Outstanding Primary School Team of the Year", "Nkoana Mohololo- 3rd Outstanding Primary school of the year.jpg", "Mohololo Nkoana"),
    ],
  },
  {
    key: "recognition-awards",
    title: "Recognition awards",
    recipients: [
      recipient("Joe Mahomole", "Long Service Award", "long ervice.jpg"),
      recipient("Jeannete Mabitsela", "Outstanding Leadership Recognition", "leader recognition.jpg"),
    ],
  },
];
