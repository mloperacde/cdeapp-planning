/**
 * Comprobación del sexo configurado en el alta de empleado a partir del nombre,
 * para detectar errores de configuración antes de guardar.
 */

const normalize = (value) =>
  String(value || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const FEMALE_NAMES = new Set([
  "MARIA", "CARMEN", "ANA", "ISABEL", "LAURA", "MARTA", "LUCIA", "SARA", "PAULA", "ELENA",
  "CRISTINA", "ROSA", "PILAR", "TERESA", "JOSEFA", "FRANCISCA", "ANTONIA", "DOLORES",
  "MERCEDES", "JULIA", "BEATRIZ", "SILVIA", "PATRICIA", "RAQUEL", "MONICA", "SONIA",
  "SUSANA", "SANDRA", "NATALIA", "VERONICA", "IRENE", "ALBA", "NOELIA", "LORENA", "ESTHER",
  "INES", "AMPARO", "CONCEPCION", "ENCARNACION", "MILAGROS", "REMEDIOS", "SOFIA", "VALERIA",
  "DANIELA", "GABRIELA", "ANDREA", "CAMILA", "ISABELLA", "VALENTINA", "MARIANA", "ALEJANDRA",
  "CAROLINA", "FERNANDA", "PAOLA", "KAREN", "JESSICA", "DIANA", "CLAUDIA", "GLORIA", "ANGELA",
  "YOLANDA", "LIDIA", "ADRIANA", "LILIANA", "GEMA", "VANESA", "VANESSA", "TAMARA", "NURIA",
  "AINHOA", "AINARA", "OIHANA", "LEIRE", "MAITE", "ITZIAR", "NEREA", "UXIA", "AROA", "ICIAR",
  "MIRIAM", "NOEMI", "REBECA", "RUTH", "EVA", "ELVIRA", "LOURDES", "CELIA", "ARIADNA", "JANA",
  "MERITXELL", "MONTSERRAT", "EULALIA", "MARIBEL", "NANCY", "GRACIELA", "MIRNA", "ANABEL",
  "MAYRA", "YADIRA", "JOHANNA", "JAZMIN", "KATHERINE", "YESENIA", "DAYANA", "XIOMARA",
  "YANETH", "MAGALY", "MARITZA", "NAYELI", "JULIANA", "MANUELA", "SALOME", "EMILY", "MELANY",
  "ANGIE", "NAYRA", "LISSETTE", "GENESIS", "SOLANGE", "KERLY", "LEIDY", "YULIANA", "ESTEFANIA",
  "VIVIANA", "LINA", "MARCELA", "CATALINA", "LUISA", "MILENA", "SHIRLEY", "KELLY", "KIMBERLY",
  "ANGELICA", "BLANCA", "IRMA", "NORMA", "OLGA", "TATIANA", "ELIZABETH", "DEYSI", "ROSARIO",
  "MARGARITA", "MARTHA", "GLADYS", "JENNY", "ALEXANDRA", "LISANDRA", "LUZ", "YENI", "SORAYA",
  "DELIA", "AMALIA", "ELSA", "NIEVES", "PURIFICACION", "ASUNCION", "ESPERANZA", "ROSALIA",
  "SAGRARIO", "BEGOÑA", "BEGONA", "CANDELA", "CAYETANA", "CLARA", "ELISA", "EMMA", "IRIS",
  "JIMENA", "LEONOR", "MARINA", "NADIA", "OLIVIA", "ROCIO", "ROMINA", "TANIA", "VIOLETA",
  "YAIZA", "ZOE", "AITANA", "ALMUDENA", "AMAYA", "ARANTXA", "BARBARA", "CONSUELO", "COVADONGA",
]);

const MALE_NAMES = new Set([
  "JOSE", "JUAN", "MANUEL", "ANTONIO", "FRANCISCO", "DAVID", "JAVIER", "DANIEL", "CARLOS",
  "MIGUEL", "RAFAEL", "PEDRO", "ANGEL", "ALEJANDRO", "FERNANDO", "LUIS", "SERGIO", "PABLO",
  "JORGE", "ALBERTO", "ALVARO", "ADRIAN", "DIEGO", "IVAN", "RUBEN", "OSCAR", "ANDRES",
  "JOAQUIN", "SANTIAGO", "EDUARDO", "MARIO", "ROBERTO", "JESUS", "RAMON", "VICENTE", "FELIX",
  "JAIME", "HUGO", "MARCOS", "IGNACIO", "GONZALO", "RODRIGO", "NICOLAS", "MARTIN", "LUCAS",
  "MATEO", "BRUNO", "ENRIQUE", "EMILIO", "JULIAN", "GABRIEL", "SAMUEL", "JACOBO", "TOMAS",
  "VICTOR", "HECTOR", "ERNESTO", "RICARDO", "ALFONSO", "ANDRES", "KELVIN", "KEVIN", "WILSON",
  "BYRON", "EDISON", "FREDDY", "HENRY", "JEFFERSON", "JONATHAN", "JONATAN", "CRISTIAN",
  "CRISTHIAN", "CHRISTIAN", "SEGUNDO", "GALO", "WASHINGTON", "MILTON", "MARCO", "HOLGER",
  "JAIRO", "DARWIN", "ELVIS", "NELSON", "FRANKLIN", "KLEBER", "LENIN", "WALTER", "PATRICIO",
  "MAURICIO", "FABIAN", "GEOVANNY", "ROMMEL", "JOHNNY", "JIMMY", "EDWIN", "STALIN", "ANGELO",
  "GERMAN", "BOLIVAR", "OSWALDO", "RICHARD", "RONALD", "GARY", "ALAN", "ANTHONY", "BRAYAN",
  "BRIAN", "CAMILO", "CESAR", "CRISTOBAL", "EFRAIN", "ELIAS", "ESTEBAN", "EZEQUIEL", "FELIPE",
  "GUSTAVO", "ISRAEL", "JESUA", "JOSHUA", "LEANDRO", "LEONARDO", "LORENZO", "MATIAS", "MAXIMO",
  "MIGUEL ANGEL", "NESTOR", "OMAR", "RAUL", "ROGELIO", "RUBEN DARIO", "SALVADOR", "SEBASTIAN",
  "SIMON", "TEODORO", "ULISES", "VALENTIN", "WILLIAM", "YAGO", "ABEL", "ADOLFO", "AGUSTIN",
  "AITOR", "ALEXIS", "AMADOR", "ANIBAL", "ARIEL", "ARTURO", "BENJAMIN", "BORJA", "CANDIDO",
  "CARMELO", "CAYETANO", "CIRILO", "DOMINGO", "DIONISIO", "EUSEBIO", "EVERARDO", "FAUSTO",
  "FLORENCIO", "GENARO", "GERARDO", "GREGORIO", "HILARIO", "HORACIO", "ISIDRO", "JACINTO",
  "JERONIMO", "JOAQUIM", "JOSUE", "LAUREANO", "LEOPOLDO", "LUCIANO", "MARCELINO", "MODESTO",
  "NICANOR", "NORBERTO", "ORLANDO", "PLACIDO", "PORFIRIO", "PRIMITIVO", "QUINTIN", "RAMIRO",
  "REINALDO", "RIGOBERTO", "SABINO", "SATURNINO", "SILVESTRE", "TEOFILO", "TIMOTEO", "URBANO",
  "VALERIANO", "WENCESLAO", "ZACARIAS",
]);

// Nombres masculinos que terminan en -a (evitan falsos positivos por sufijo)
const MALE_ENDING_A = new Set(["JOSHUA", "LUKA", "LUCA", "NICOLA", "EZRA", "ELISHA", "JESUA", "ISAIA"]);

const PARTICLES = new Set(["DE", "DEL", "LA", "LAS", "LOS", "Y", "DA", "DO", "DOS", "DAS", "SAN", "SANTA", "VAN", "DI"]);

/**
 * Deduce el sexo a partir del nombre. Devuelve "Masculino", "Femenino" o null si no
 * hay suficiente certeza (en ese caso no se avisa de nada).
 */
export function inferSexFromName(nombre) {
  const tokens = normalize(nombre).split(" ").filter((t) => t && !PARTICLES.has(t));
  if (tokens.length === 0) return null;

  const first = tokens[0];

  if (FEMALE_NAMES.has(first)) return "Femenino";
  if (MALE_NAMES.has(first)) return "Masculino";

  // Nombres compuestos del tipo "JOSE MARIA" / "MARIA JOSE"
  const maleToken = tokens.find((t) => MALE_NAMES.has(t));
  const femaleToken = tokens.find((t) => FEMALE_NAMES.has(t));
  if (maleToken && !femaleToken) return "Masculino";
  if (femaleToken && !maleToken) return "Femenino";
  if (maleToken && femaleToken) {
    const maleIndex = tokens.indexOf(maleToken);
    const femaleIndex = tokens.indexOf(femaleToken);
    return maleIndex < femaleIndex ? "Masculino" : "Femenino";
  }

  if (MALE_ENDING_A.has(first)) return "Masculino";
  if (/A$/.test(first)) return "Femenino";
  if (/O$/.test(first)) return "Masculino";

  return null;
}

/**
 * Comprueba que el sexo seleccionado coincide con el nombre.
 * Devuelve un mensaje de error si hay incoherencia, o null si todo está bien.
 */
export function checkSexConsistency(nombre, sexo) {
  if (!sexo || sexo === "Otro") return null;
  const inferred = inferSexFromName(nombre);
  if (!inferred || inferred === sexo) return null;
  return `El nombre "${String(nombre || "").trim()}" parece ${inferred.toLowerCase()} pero has seleccionado ${sexo}. Revisa el sexo del empleado antes de guardar.`;
}