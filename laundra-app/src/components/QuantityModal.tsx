import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { PrimaryButton } from './PrimaryButton';

interface QuantityModalProps {
  visible: boolean;
  orderId: string;
  onClose: () => void;
  onConfirm: (count: number) => void;
}

export const QuantityModal: React.FC<QuantityModalProps> = ({ visible, orderId, onClose, onConfirm }) => {
  const [count, setCount] = useState('5');

  const handleSubmit = () => {
    const num = parseInt(count) || 1;
    onConfirm(num);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>🧺 Confirm Item Count</Text>
          <Text style={styles.subtitle}>Enter the total number of clothes items received from customer for Order #{orderId}.</Text>

          <TextInput
            style={styles.input}
            value={count}
            onChangeText={setCount}
            keyboardType="number-pad"
            placeholder="Count"
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <PrimaryButton
              title="Save & Complete"
              onPress={handleSubmit}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#ffffff',
    borderRadius: radius.card,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.button,
    padding: 14,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14,
  },
});
