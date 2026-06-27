import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, SafeAreaView } from 'react-native';

interface Props {
  navigation: any;
}

const CONTACT = {
  phone: '(00) 0000-0000',
  whatsapp: '5500000000000',
  email: 'suporte@cariripdv.com.br',
  site: 'https://cariripdv.com.br',
};

export default function ContactScreen({ navigation }: Props) {
  const handleCall = () => Linking.openURL(`tel:${CONTACT.phone.replace(/\D/g, '')}`);
  const handleWhatsapp = () => Linking.openURL(`https://wa.me/${CONTACT.whatsapp}`);
  const handleEmail = () => Linking.openURL(`mailto:${CONTACT.email}`);
  const handleSite = () => Linking.openURL(CONTACT.site);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fale Conosco</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        <Text style={styles.intro}>
          Precisa de ajuda? Entre em contato com nosso suporte por um dos canais abaixo.
        </Text>

        <TouchableOpacity style={styles.item} onPress={handleWhatsapp}>
          <Text style={styles.itemIcon}>💬</Text>
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemLabel}>WhatsApp</Text>
            <Text style={styles.itemValue}>{CONTACT.phone}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={handleCall}>
          <Text style={styles.itemIcon}>📞</Text>
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemLabel}>Telefone</Text>
            <Text style={styles.itemValue}>{CONTACT.phone}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={handleEmail}>
          <Text style={styles.itemIcon}>✉️</Text>
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemLabel}>E-mail</Text>
            <Text style={styles.itemValue}>{CONTACT.email}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} onPress={handleSite}>
          <Text style={styles.itemIcon}>🌐</Text>
          <View style={styles.itemTextContainer}>
            <Text style={styles.itemLabel}>Site / Central de Ajuda</Text>
            <Text style={styles.itemValue}>{CONTACT.site.replace('https://', '')}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: '#374151',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerRight: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  intro: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  itemValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
});
