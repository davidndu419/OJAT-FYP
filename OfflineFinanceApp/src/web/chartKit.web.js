import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';

const ChartPlaceholder = ({height = 220}) => (
  <View style={[styles.container, {height}]}>
    <Text variant="bodyMedium" style={styles.text}>
      Chart preview is available in the Android build.
    </Text>
  </View>
);

export const BarChart = props => <ChartPlaceholder {...props} />;

export const PieChart = props => <ChartPlaceholder {...props} />;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    padding: 16,
  },
  text: {
    color: '#64748b',
    textAlign: 'center',
  },
});
