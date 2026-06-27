import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, View, ActivityIndicator, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import BranchSelectionScreen from './src/screens/BranchSelectionScreen';
import CashRegisterScreen from './src/screens/CashRegisterScreen';
import SalesScreen from './src/screens/SalesScreen';
import CartScreen from './src/screens/CartScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ContactScreen from './src/screens/ContactScreen';

// Store
import { useAuthStore } from './src/store/authStore';
import { useSessionStore } from './src/store/sessionStore';

// Services
import { StonePayment } from './src/services/payment/stone';
import { syncPendingSales } from './src/services/offline/offlineQueue';

const Stack = createNativeStackNavigator();

function App(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated, _hydrated } = useAuthStore();
  const { setOfflineMode } = useSessionStore();

  useEffect(() => {
    const initApp = async () => {
      // Inicializar SDK de pagamento
      await StonePayment.initialize();

      // Aguardar hidratação do store
      if (_hydrated) {
        setIsLoading(false);
      }
    };

    initApp();
  }, [_hydrated]);

  useEffect(() => {
    let wasOffline = false;

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isOnline = !!state.isConnected;
      setOfflineMode(!isOnline);

      if (isOnline && wasOffline) {
        syncPendingSales();
      }
      wasOffline = !isOnline;
    });

    return unsubscribe;
  }, [setOfflineMode]);

  if (isLoading || !_hydrated) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#2563eb" barStyle="light-content" />
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar backgroundColor="#2563eb" barStyle="light-content" />
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'BranchSelection' : 'Login'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {/* Auth Screens */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="BranchSelection" component={BranchSelectionScreen} />

        {/* Cash Register */}
        <Stack.Screen name="CashRegister" component={CashRegisterScreen} />

        {/* Sales Flow */}
        <Stack.Screen name="Sales" component={SalesScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="Payment" component={PaymentScreen} />

        {/* History */}
        <Stack.Screen name="History" component={HistoryScreen} />

        {/* Contact */}
        <Stack.Screen name="Contact" component={ContactScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default App;
