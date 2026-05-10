import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, TouchableOpacity, View, Platform} from 'react-native';
import {Text, Button, Divider, Portal, Modal} from 'react-native-paper';
import {Calendar, Clock, X} from 'lucide-react-native';
import {COLORS, FONT_FAMILY, cardShadow, popShadow} from '../theme/theme';
import {KoboButton, KoboDatePicker} from './KoboUI';

const PRESETS = ['Today', 'This Week', 'This Month'];

export const DateFilterSheet = ({
  onApply,
  initialRange = {from: new Date(), to: new Date()},
  visible,
  onDismiss,
}) => {
  const [activePreset, setActivePreset] = useState('This Month');
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const handleApply = () => {
    onApply({from: fromDate, to: toDate, preset: activePreset});
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.webModal}>
        <View style={styles.webContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Filter by Date</Text>
            <TouchableOpacity onPress={onDismiss}>
              <X color={COLORS.muted} size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.presetRow}>
            {PRESETS.map(preset => (
              <TouchableOpacity
                key={preset}
                onPress={() => setActivePreset(preset)}
                style={[
                  styles.presetTab,
                  activePreset === preset && styles.presetTabActive,
                ]}>
                <Text
                  style={[
                    styles.presetText,
                    activePreset === preset && styles.presetTextActive,
                  ]}>
                  {preset}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Divider style={styles.divider} />

          <Text style={styles.sectionTitle}>Custom Range</Text>
          <View style={styles.rangeContainer}>
            <TouchableOpacity
              onPress={() => setShowFromPicker(true)}
              style={styles.datePickerBtn}>
              <View style={styles.dateLabelRow}>
                <Calendar size={14} color={COLORS.muted} />
                <Text style={styles.dateLabel}>FROM</Text>
              </View>
              <Text style={styles.dateValue}>{fromDate.toLocaleDateString()}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowToPicker(true)}
              style={styles.datePickerBtn}>
              <View style={styles.dateLabelRow}>
                <Calendar size={14} color={COLORS.muted} />
                <Text style={styles.dateLabel}>TO</Text>
              </View>
              <Text style={styles.dateValue}>{toDate.toLocaleDateString()}</Text>
            </TouchableOpacity>
          </View>

          <KoboDatePicker
            visible={showFromPicker}
            value={fromDate}
            onDismiss={() => setShowFromPicker(false)}
            onChange={(event, date) => {
              setShowFromPicker(false);
              if (date) setFromDate(date);
            }}
          />

          <KoboDatePicker
            visible={showToPicker}
            value={toDate}
            onDismiss={() => setShowToPicker(false)}
            onChange={(event, date) => {
              setShowToPicker(false);
              if (date) setToDate(date);
            }}
          />

          <KoboButton onPress={handleApply} style={styles.applyBtn}>
            Apply Range
          </KoboButton>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  indicator: {
    backgroundColor: COLORS.line,
    width: 40,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: FONT_FAMILY,
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  presetTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetTabActive: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.primary,
  },
  presetText: {
    fontFamily: FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.muted,
  },
  presetTextActive: {
    color: COLORS.primary,
  },
  divider: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: FONT_FAMILY,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  rangeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  datePickerBtn: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    padding: 14,
  },
  dateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dateLabel: {
    fontFamily: FONT_FAMILY,
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.muted,
  },
  dateValue: {
    fontFamily: FONT_FAMILY,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  applyBtn: {
    marginTop: 'auto',
  },
  webModal: {
    backgroundColor: COLORS.surface,
    padding: 0,
    margin: 20,
    borderRadius: 24,
    alignSelf: 'center',
    maxWidth: 400,
    width: '100%',
    overflow: 'hidden',
  },
  webContent: {
    padding: 24,
  },
});
