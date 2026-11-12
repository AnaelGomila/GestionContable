import { r2 } from './format.js'

const suma = (saldos, tipo) => r2(saldos.filter((s) => s.tipo === tipo).reduce((a, s) => a + Number(s.saldo), 0))

// Ecuación patrimonial: Activo = Pasivo + Patrimonio neto + Resultado del ejercicio
export function resumenPatrimonial(saldos) {
  const activo = suma(saldos, 'activo')
  const pasivo = suma(saldos, 'pasivo')
  const patrimonio = suma(saldos, 'patrimonio')
  const ingresos = suma(saldos, 'ingreso')
  const egresos = suma(saldos, 'egreso')
  const resultado = r2(ingresos - egresos)
  const lado = r2(pasivo + patrimonio + resultado)
  return { activo, pasivo, patrimonio, ingresos, egresos, resultado, pasivoMasPn: lado, cierra: Math.abs(activo - lado) < 0.005 }
}

export const saldoDe = (saldos, codigo) => Number(saldos.find((s) => s.codigo === codigo)?.saldo ?? 0)
