export type Difficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

export interface Piece {
  slug: string;
  title: string;
  composer: string;
  difficulty: Difficulty;
  bpm: number;
  timeSignature: { beats: number; beatType: number };
  totalMeasures: number;
  xmlPath: string;
  description: string;
}

export const PIECES: Piece[] = [
  {
    slug: "twinkle_twinkle",
    title: "きらきら星",
    composer: "伝承曲",
    difficulty: 4,
    bpm: 100,
    timeSignature: { beats: 4, beatType: 4 },
    totalMeasures: 8,
    xmlPath: "/scores/twinkle_twinkle.xml",
    description: "だれもが知る童謡のメロディー。4拍子のシンプルな音階で構成された入門曲。",
  },
  {
    slug: "fur_elise",
    title: "エリーゼのために",
    composer: "L.v. ベートーヴェン",
    difficulty: 6,
    bpm: 80,
    timeSignature: { beats: 3, beatType: 4 },
    totalMeasures: 8,
    xmlPath: "/scores/fur_elise.xml",
    description: "ベートーヴェンの最も有名な小品。イ短調の哀愁漂うテーマが印象的。",
  },
  {
    slug: "gymnopedia_1",
    title: "ジムノペディ 第1番",
    composer: "E. サティ",
    difficulty: 10,
    bpm: 76,
    timeSignature: { beats: 3, beatType: 4 },
    totalMeasures: 8,
    xmlPath: "/scores/gymnopedia_1.xml",
    description: "サティの代表作。ゆったりとした3拍子に乗る幻想的で叙情的なメロディー。",
  },
  {
    slug: "pachelbel_canon",
    title: "カノン",
    composer: "J. パッヘルベル",
    difficulty: 14,
    bpm: 80,
    timeSignature: { beats: 4, beatType: 4 },
    totalMeasures: 8,
    xmlPath: "/scores/pachelbel_canon.xml",
    description: "バロック時代の傑作。繰り返す和声進行と美しいメロディーラインが特徴。",
  },
  {
    slug: "chopin_etude_op10_12",
    title: "エチュード Op.10 No.12「革命」",
    composer: "F. ショパン",
    difficulty: 19,
    bpm: 120,
    timeSignature: { beats: 4, beatType: 4 },
    totalMeasures: 8,
    xmlPath: "/scores/chopin_etude_op10_12.xml",
    description: "「革命のエチュード」として知られる名曲。激しい感情と高度な技術が要求される。",
  },
  {
    slug: "bach_minuet_g",
    title: "メヌエット ト長調 BWV Anh.114",
    composer: "J.S. バッハ",
    difficulty: 2,
    bpm: 120,
    timeSignature: { beats: 3, beatType: 4 },
    totalMeasures: 12,
    xmlPath: "/scores/bach_minuet_g.xml",
    description: "バッハの最も親しみやすい曲のひとつ。3拍子のリズムと美しいメロディーが特徴。",
  },
  {
    slug: "beethoven_ode_to_joy",
    title: "喜びの歌",
    composer: "L.v. ベートーヴェン",
    difficulty: 1,
    bpm: 100,
    timeSignature: { beats: 4, beatType: 4 },
    totalMeasures: 8,
    xmlPath: "/scores/beethoven_ode_to_joy.xml",
    description: "第9交響曲より。シンプルな音階で構成された入門者向けの名曲。",
  },
  {
    slug: "mozart_alla_turca",
    title: "トルコ行進曲",
    composer: "W.A. モーツァルト",
    difficulty: 8,
    bpm: 140,
    timeSignature: { beats: 2, beatType: 4 },
    totalMeasures: 8,
    xmlPath: "/scores/mozart_alla_turca.xml",
    description: "ピアノソナタ第11番第3楽章。軽快なリズムが特徴の人気曲。",
  },
  {
    slug: "beethoven_moonlight",
    title: "月光ソナタ 第1楽章",
    composer: "L.v. ベートーヴェン",
    difficulty: 12,
    bpm: 60,
    timeSignature: { beats: 4, beatType: 4 },
    totalMeasures: 4,
    xmlPath: "/scores/beethoven_moonlight.xml",
    description: "Op.27 No.2。三連符の連続が醸し出す幻想的な雰囲気が特徴。",
  },
  {
    slug: "chopin_nocturne",
    title: "夜想曲 Op.9 No.2",
    composer: "F. ショパン",
    difficulty: 16,
    bpm: 66,
    timeSignature: { beats: 12, beatType: 8 },
    totalMeasures: 4,
    xmlPath: "/scores/chopin_nocturne.xml",
    description: "ショパンのノクターンの中で最も有名な作品。歌うようなメロディーが美しい。",
  },
];

export function getPiecesByDifficulty(difficulty: Difficulty): Piece[] {
  return PIECES.filter((p) => Math.abs(p.difficulty - difficulty) <= 1);
}

export function getPieceBySlug(slug: string): Piece | undefined {
  return PIECES.find((p) => p.slug === slug);
}

export function getPiecesForLevel(level: Difficulty): Piece[] {
  const ranges: Record<number, [Difficulty, Difficulty]> = {
    1: [1, 2], 2: [1, 3], 3: [2, 4], 4: [3, 5], 5: [4, 6],
    6: [5, 7], 7: [6, 8], 8: [7, 9], 9: [8, 10], 10: [9, 11],
    11: [10, 12], 12: [11, 13], 13: [12, 14], 14: [13, 15], 15: [14, 16],
    16: [15, 17], 17: [16, 18], 18: [17, 19], 19: [18, 20], 20: [19, 20],
  };
  const [min, max] = ranges[level] ?? [level, level];
  return PIECES.filter((p) => p.difficulty >= min && p.difficulty <= max);
}
