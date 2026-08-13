export const DOMINIO_CORREO = "@tumuniclm.com";

const PARTICULAS = new Set([
  "de",
  "del",
  "la",
  "las",
  "los",
  "lo",
  "y",
  "e",
  "da",
  "das",
  "do",
  "dos",
  "di",
  "le",
  "el",
  "al",
  "van",
  "von",
  "san",
  "santa",
  "sto",
  "sta",
]);

function normalizarToken(palabra: string) {
  return palabra
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ñ/gi, "n")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

export function extraerUsuario(valor: string) {
  const recortado = valor.trim();
  const sinDominio = recortado.toLowerCase().endsWith(DOMINIO_CORREO)
    ? recortado.slice(0, -DOMINIO_CORREO.length)
    : recortado;
  const indiceArroba = sinDominio.indexOf("@");
  const local = indiceArroba === -1 ? sinDominio : sinDominio.slice(0, indiceArroba);
  return local.replace(/\s/g, "");
}

export function correoDesdeUsuario(usuario: string) {
  const local = extraerUsuario(usuario);
  return local ? `${local}${DOMINIO_CORREO}` : "";
}

export function usuarioBaseDesdeNombre(nombre: string) {
  const tokens = nombre
    .trim()
    .split(/\s+/)
    .map(normalizarToken)
    .filter((token, indice) => {
      if (!token) return false;
      if (PARTICULAS.has(token)) return false;
      if (indice > 0 && token.length <= 3) return false;
      return true;
    });

  if (tokens.length < 2) return "";

  const inicial = tokens[0][0] ?? "";
  const apellido = tokens.length >= 3 ? tokens[tokens.length - 2] : tokens[1];
  if (!inicial || !apellido) return "";
  return `${inicial}${apellido}`;
}

