package br.com.cariripdv.posapp.pdv.printer

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Ponte React Native <-> impressora térmica da maquininha.
 *
 * Esqueleto pronto para receber o SDK do fabricante (Stone TON usa SDK
 * próprio; Moderninha usa o SDK PlugPag). Sem o SDK instalado, todo método
 * retorna erro "printer_sdk_not_installed" e o lado JS
 * (src/services/printer/thermalPrinter.ts) cai automaticamente no modo
 * simulado (console.log), já que isPrinterAvailable fica false quando
 * este módulo não responde.
 *
 * Para integrar de verdade:
 * 1. Adicionar a dependência/SDK de impressão do fabricante da maquininha
 * 2. Implementar print()/feedPaper()/cutPaper() chamando a API real do SDK
 * 3. Testar na máquina física (a impressão térmica não é simulável no emulador)
 */
class PrinterModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "PrinterModule"

  @ReactMethod
  fun print(text: String, promise: Promise) {
    // TODO: enviar `text` para a impressora térmica via SDK do fabricante
    promise.reject("printer_sdk_not_installed", "SDK da impressora ainda não foi integrado")
  }

  @ReactMethod
  fun feedPaper(lines: Int, promise: Promise) {
    // TODO: avançar papel via SDK do fabricante
    promise.reject("printer_sdk_not_installed", "SDK da impressora ainda não foi integrado")
  }

  @ReactMethod
  fun cutPaper(promise: Promise) {
    // TODO: cortar papel via SDK do fabricante (se a maquininha suportar)
    promise.reject("printer_sdk_not_installed", "SDK da impressora ainda não foi integrado")
  }
}
