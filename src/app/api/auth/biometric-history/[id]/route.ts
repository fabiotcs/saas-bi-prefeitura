import { NextResponse } from 'next/server'

export async function DELETE() {
  return NextResponse.json(
    { error: 'Operação não permitida. Registros biométricos são imutáveis.' },
    { status: 403 }
  )
}
