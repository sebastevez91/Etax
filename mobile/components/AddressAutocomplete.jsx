import { useState, useCallback, useRef } from 'react';
import {
  View, TextInput, TouchableOpacity,
  Text, StyleSheet, ActivityIndicator
} from 'react-native';
import { searchPlaces } from '../services/mapbox';

export default function AddressAutocomplete({ placeholder, onSelect }) {
  const [query, setQuery]             = useState('');
  const [results, setResults]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef                   = useRef(null);

  const handleChange = useCallback((text) => {
    setQuery(text);
    setShowResults(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (text.length < 3) {
        setResults([]);
        return;
      }
      setLoading(true);
      const places = await searchPlaces(text);
      setResults(places);
      setLoading(false);
    }, 400);
  }, []);

  const handleSelect = (place) => {
    setQuery(place.name);
    setResults([]);
    setShowResults(false);
    onSelect?.(place);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder={placeholder || 'Buscá una dirección...'}
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={handleChange}
          onFocus={() => setShowResults(true)}
        />
        {loading && (
          <ActivityIndicator size="small" color="#6366f1" style={styles.loader} />
        )}
      </View>

      {showResults && results.length > 0 && (
        <View style={styles.dropdown}>
          {results.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.item}
              onPress={() => handleSelect(item)}
            >
              <Text style={styles.itemIcon}>📍</Text>
              <Text style={styles.itemText} numberOfLines={2}>
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { position: 'relative', zIndex: 999, marginBottom: 12 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 12 },
  input:        { flex: 1, height: 48, fontSize: 15, color: '#fff' },
  loader:       { marginLeft: 8 },
  dropdown:     { position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 10, zIndex: 999 },
  item:         { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  itemIcon:     { fontSize: 16, marginRight: 8 },
  itemText:     { flex: 1, fontSize: 14, color: '#e2e8f0' },
});