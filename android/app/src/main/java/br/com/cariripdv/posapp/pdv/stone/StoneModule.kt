package br.com.cariripdv.posapp.pdv.stone

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments

/**
 * Ponte React Native <-> SDK da Stone.
 *
 * Esqueleto pronto para receber o SDK real (pos-android-sdk). Sem o SDK
 * instalado, todo método retorna erro "stone_sdk_not_installed" e o lado
 * JS (src/services/payment/stone.ts) cai automaticamente no modo simulado,
 * já que isStoneDevice fica false quando este módulo não responde.
 *
 * Para integrar de verdade:
 * 1. Adicionar a dependência da Stone em android/app/build.gradle
 *    (implementation 'com.stone.posandroid:pos-android-sdk:x.x.x')
 * 2. Inicializar o SDK em initialize() com as credenciais do parceiro
 * 3. Implementar cada método chamando a API real do SDK
 * 4. Testar numa maquininha de homologação Stone
 */
class StoneModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "StoneModule"

  @ReactMethod
  fun initialize(promise: Promise) {
    // TODO: inicializar o SDK Stone (StoneStart, credenciais do parceiro, etc.)
    promise.reject("stone_sdk_not_installed", "SDK da Stone ainda não foi integrado")
  }

  @ReactMethod
  fun doPaymentCredit(amountInCents: Double, installments: Int, promise: Promise) {
    // TODO: chamar transação de crédito do SDK Stone com amountInCents/installments
    promise.reject("stone_sdk_not_installed", "SDK da Stone ainda não foi integrado")
  }

  @ReactMethod
  fun doPaymentDebit(amountInCents: Double, promise: Promise) {
    // TODO: chamar transação de débito do SDK Stone
    promise.reject("stone_sdk_not_installed", "SDK da Stone ainda não foi integrado")
  }

  @ReactMethod
  fun doPaymentPix(amountInCents: Double, promise: Promise) {
    // TODO: chamar transação PIX do SDK Stone
    promise.reject("stone_sdk_not_installed", "SDK da Stone ainda não foi integrado")
  }

  @ReactMethod
  fun cancelTransaction(transactionId: String, promise: Promise) {
    // TODO: chamar cancelamento/estorno do SDK Stone
    promise.reject("stone_sdk_not_installed", "SDK da Stone ainda não foi integrado")
  }

  @ReactMethod
  fun reprintLastReceipt(promise: Promise) {
    // TODO: chamar reimpressão do último comprovante via SDK Stone
    promise.reject("stone_sdk_not_installed", "SDK da Stone ainda não foi integrado")
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
