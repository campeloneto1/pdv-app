package br.com.cariripdv.posapp.pdv

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())

          // PlugPag (PagBank) e impressora térmica: esqueletos prontos em
          // pagbank/PlugPagModule.kt e printer/PrinterModule.kt. Descomente as
          // duas linhas abaixo SOMENTE depois de implementar os métodos com
          // o SDK real do fabricante - enquanto os métodos só fazem
          // promise.reject(), registrar o módulo quebra o modo simulado
          // hoje usado em src/services/payment/pagbank.ts e thermalPrinter.ts.
          // add(br.com.cariripdv.posapp.pdv.pagbank.PlugPagPackage())
          // add(br.com.cariripdv.posapp.pdv.printer.PrinterPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
