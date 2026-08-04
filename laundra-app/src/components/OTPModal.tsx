import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { PrimaryButton } from './PrimaryButton';

interface OTPModalProps {
  visible: boolean;
  orderId: string;
  onClose: () => void;
  onVerify: (otp: string) => Promise<boolean>;
}

export const OTPModal: React.FC<OTPModalProps> = ({ visible, orderId, onClose, onVerify }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!otp || otp.length < 4) {
      setError('Please enter valid 4-digit OTP');
      return;
    }
    setError('');
    setLoading(true);
    const success = await onVerify(otp);
    setLoading(false);
    if (success) {
      setOtp('');
      onClose();
    } else {
      setError('Invalid OTP code. Please try again.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>🔐 Enter Delivery OTP</Text>
          <Text style={styles.subtitle}>Ask customer for the 4-digit verification code sent to their phone for Order #{orderId}.</Text>

          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="1 2 3 4"
            placeholderTextColor={colors.textMuted}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <PrimaryButton
              title="Verify & Complete"
              onPress={handleSubmit}
              loading={loading}
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
  otpInput: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: radius.button,
    padding: 14,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 8,
    color: colors.textPrimary,
    marginBottom: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
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
