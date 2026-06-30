import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useSessionStore } from '../store/sessionStore';
import api, { extractArrayData } from '../api/api';
import { Category, Product, getImageUrl } from '../types';
import { getPendingCount, syncPendingSales } from '../services/offline/offlineQueue';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface Props {
  navigation: any;
}

export default function SalesScreen({ navigation }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [scanningBarcode, setScanningBarcode] = useState(false);
  const [pendingSalesCount, setPendingSalesCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const { selectedBranch, logout } = useAuthStore();
  const { items, addItem, clearCart } = useCartStore();
  const { cashRegister, closeCashRegister, selectedBranchName, isOfflineMode } =
    useSessionStore();

  const filteredProducts = searchQuery.trim()
    ? products.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : products;

  const cartTotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (!selectedBranch || !cashRegister) {
      navigation.replace('CashRegister');
      return;
    }
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshPendingCount();
    }, [])
  );

  const refreshPendingCount = async () => {
    setPendingSalesCount(await getPendingCount());
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const result = await syncPendingSales();
      await refreshPendingCount();
      if (result.synced > 0) {
        Alert.alert('Sincronização', `${result.synced} venda(s) sincronizada(s) com sucesso.`);
      } else if (result.failed === 0) {
        Alert.alert('Sincronização', 'Nenhuma venda pendente ou sem conexão com o servidor.');
      }
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (selectedCategoryId) {
      loadProducts(selectedCategoryId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

  const loadCategories = async () => {
    try {
      const response = await api.get(`/branches/${selectedBranch?.id}/categories`);
      const data = extractArrayData(response);
      setCategories(data);
      if (data.length > 0) {
        setSelectedCategoryId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (categoryId: number) => {
    setLoadingProducts(true);
    try {
      const response = await api.get(
        `/branches/${selectedBranch?.id}/categories/${categoryId}/products`
      );
      setProducts(extractArrayData(response));
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleAddToCart = useCallback((product: Product) => {
    addItem({
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit_price: product.sale_price,
    });
  }, [addItem]);

  // Leitores de código de barras (USB/Bluetooth) funcionam como teclado:
  // digitam o código e disparam um Enter ao final.
  const handleBarcodeSubmit = async () => {
    const code = searchQuery.trim();
    if (!code || scanningBarcode) return;

    setScanningBarcode(true);
    try {
      const response = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
      const product = response.data?.product || response.data?.data;
      if (product) {
        handleAddToCart(product);
        setSearchQuery('');
      }
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        Alert.alert('Erro', 'Não foi possível buscar o produto pelo código de barras');
      }
      // 404: não é um código de barras válido, mantém como busca por nome
    } finally {
      setScanningBarcode(false);
    }
  };

  const handleOpenMenu = () => {
    setShowMenu(true);
  };

  const handleHistory = () => {
    setShowMenu(false);
    navigation.navigate('History');
  };

  const handleChangeBranch = () => {
    setShowMenu(false);
    closeCashRegister();
    clearCart();
    navigation.navigate('BranchSelection');
  };

  const handleCloseCashRegister = () => {
    setShowMenu(false);
    navigation.navigate('CashRegister');
  };

  const handleContact = () => {
    setShowMenu(false);
    navigation.navigate('Contact');
  };

  const handleLogout = () => {
    setShowMenu(false);
    closeCashRegister();
    clearCart();
    logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const renderCategoryItem = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategoryId === item.id && styles.categoryButtonActive,
      ]}
      onPress={() => setSelectedCategoryId(item.id)}
    >
      <Text
        style={[
          styles.categoryText,
          selectedCategoryId === item.id && styles.categoryTextActive,
        ]}
        numberOfLines={1}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }: { item: Product }) => {
    const imageUrl = getImageUrl(item);
    return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => handleAddToCart(item)}
      activeOpacity={0.7}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.productImage} />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Text style={styles.productImageEmoji}>📦</Text>
        </View>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.productPrice}>
          R$ {item.sale_price.toFixed(2).replace('.', ',')}
        </Text>
      </View>
      <View style={styles.addButton}>
        <Text style={styles.addButtonText}>+</Text>
      </View>
    </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={handleOpenMenu}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedBranch?.name}</Text>
        <View style={styles.headerRight}>
          {(isOfflineMode || pendingSalesCount > 0) && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>
                {isOfflineMode ? '📴' : `🔄 ${pendingSalesCount}`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar produto ou escanear código de barras..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleBarcodeSubmit}
          returnKeyType="search"
          blurOnSubmit={false}
        />
        {scanningBarcode && (
          <ActivityIndicator size="small" color="#2563eb" style={styles.searchSpinner} />
        )}
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCategoryItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Products */}
      {loadingProducts ? (
        <View style={styles.loadingProducts}>
          <ActivityIndicator size="small" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProductItem}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery.trim()
                  ? 'Nenhum produto encontrado'
                  : 'Nenhum produto nesta categoria'}
              </Text>
            </View>
          }
        />
      )}

      {/* Cart Button */}
      {cartCount > 0 && (
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => navigation.navigate('Cart')}
          activeOpacity={0.9}
        >
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cartCount}</Text>
          </View>
          <Text style={styles.cartButtonText}>Ver Carrinho</Text>
          <Text style={styles.cartTotal}>
            R$ {cartTotal.toFixed(2).replace('.', ',')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Menu Modal */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuBranchName}>{selectedBranchName || selectedBranch?.name}</Text>
              <TouchableOpacity onPress={() => setShowMenu(false)}>
                <Text style={styles.menuCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={handleHistory}>
              <Text style={styles.menuItemIcon}>📋</Text>
              <Text style={styles.menuItemText}>Histórico de Vendas</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleChangeBranch}>
              <Text style={styles.menuItemIcon}>🏪</Text>
              <Text style={styles.menuItemText}>Trocar Filial</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleCloseCashRegister}>
              <Text style={styles.menuItemIcon}>💰</Text>
              <Text style={styles.menuItemText}>Fechar Caixa</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleContact}>
              <Text style={styles.menuItemIcon}>☎️</Text>
              <Text style={styles.menuItemText}>Fale Conosco</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                handleSyncNow();
              }}
              disabled={syncing}
            >
              <Text style={styles.menuItemIcon}>🔄</Text>
              <Text style={styles.menuItemText}>
                {syncing
                  ? 'Sincronizando...'
                  : `Sincronizar Vendas Pendentes${pendingSalesCount > 0 ? ` (${pendingSalesCount})` : ''}`}
              </Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Text style={styles.menuItemIcon}>🚪</Text>
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Sair</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
    color: '#374151',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerRight: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  offlineBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  searchSpinner: {
    marginLeft: 10,
  },
  categoriesContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 10,
  },
  categoryButtonActive: {
    backgroundColor: '#2563eb',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryTextActive: {
    color: '#fff',
  },
  loadingProducts: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productsList: {
    padding: 12,
    paddingBottom: 100,
  },
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: CARD_WIDTH * 0.7,
    backgroundColor: '#f3f4f6',
  },
  productImagePlaceholder: {
    width: '100%',
    height: CARD_WIDTH * 0.7,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImageEmoji: {
    fontSize: 40,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    height: 40,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  addButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  cartButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cartBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cartBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  cartButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  // Menu Modal Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginTop: 100,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#2563eb',
  },
  menuBranchName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  menuCloseIcon: {
    fontSize: 20,
    color: '#fff',
    padding: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  menuItemTextDanger: {
    color: '#ef4444',
  },
  menuDivider: {
    height: 8,
    backgroundColor: '#f3f4f6',
  },
});
