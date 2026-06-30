package br.com.cariripdv.posapp.pdv.pagbank

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments

/**
 * Ponte React Native <-> SDK PlugPag (PagBank).
 *
 * Esqueleto pronto para receber o SDK real (PlugPag). Sem o SDK
 * instalado, todo método retorna erro "plugpag_sdk_not_installed" e o lado
 * JS (src/services/payment/pagbank.ts) cai automaticamente no modo simulado,
 * já que isPagBankDevice fica false quando este módulo não responde.
 *
 * Para integrar de verdade:
 * 1. Adicionar a dependência do PlugPag em android/app/build.gradle
 *    (com.uol.pagseguro.plugpagservice.wrapper)
 * 2. Inicializar o SDK em initialize() com PlugPag(reactContext) e as
 *    credenciais do parceiro (PlugPagActivationData)
 * 3. Implementar cada método chamando a API real do SDK
 *    (PlugPag.doPayment com PlugPagPaymentData)
 * 4. Testar numa maquininha de homologação PagBank
 */
class PlugPagModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "PlugPagModule"

  @ReactMethod
  fun initialize(promise: Promise) {
    // TODO: inicializar o SDK PlugPag (PlugPag(reactContext), credenciais do parceiro, etc.)
    promise.reject("plugpag_sdk_not_installed", "SDK PlugPag ainda não foi integrado")
  }

  @ReactMethod
  fun doPaymentCredit(amountInCents: Double, installments: Int, promise: Promise) {
    // TODO: chamar transação de crédito do SDK PlugPag com amountInCents/installments
    promise.reject("plugpag_sdk_not_installed", "SDK PlugPag ainda não foi integrado")
  }

  @ReactMethod
  fun doPaymentDebit(amountInCents: Double, promise: Promise) {
    // TODO: chamar transação de débito do SDK PlugPag
    promise.reject("plugpag_sdk_not_installed", "SDK PlugPag ainda não foi integrado")
  }

  @ReactMethod
  fun doPaymentPix(amountInCents: Double, promise: Promise) {
    // TODO: chamar transação PIX do SDK PlugPag
    promise.reject("plugpag_sdk_not_installed", "SDK PlugPag ainda não foi integrado")
  }

  @ReactMethod
  fun cancelTransaction(transactionId: String, promise: Promise) {
    // TODO: chamar cancelamento/estorno do SDK PlugPag
    promise.reject("plugpag_sdk_not_installed", "SDK PlugPag ainda não foi integrado")
  }

  @ReactMethod
  fun reprintLastReceipt(promise: Promise) {
    // TODO: chamar reimpressão do último comprovante via SDK PlugPag
    promise.reject("plugpag_sdk_not_installed", "SDK PlugPag ainda não foi integrado")
  }

  /** Helper de exemplo para quando o SDK real responder com os dados da transação. */
  private fun buildResult(
    transactionId: String,
    authorizationCode: String?,
    cardBrand: String?,
    cardLastDigits: String?,
    receipt: String?
  ): WritableMap {
    val map = Arguments.createMap()
    map.putString("transactionId", transactionId)
    authorizationCode?.let { map.putString("authorizationCode", it) }
    cardBrand?.let { map.putString("cardBrand", it) }
    cardLastDigits?.let { map.putString("cardLastDigits", it) }
    receipt?.let { map.putString("receipt", it) }
    return map
  }
}
