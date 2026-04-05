import React, { useEffect } from 'react';
import { Platform, StatusBar as RNStatusBar } from 'react-native';

export function AppStatusBarBlue() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      RNStatusBar.setBackgroundColor('#1e98f3', true);
      RNStatusBar.setTranslucent(false);
    }
  }, []);

  return <RNStatusBar barStyle="light-content" backgroundColor="#1e98f3" translucent={false} />;
}
