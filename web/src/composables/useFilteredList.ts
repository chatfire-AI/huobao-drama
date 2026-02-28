import { ref, computed, type Ref } from 'vue'

export function useFilteredList<T>(options: {
  items: Ref<T[]>
  searchFields: (keyof T)[]
  filterField?: keyof T
}) {
  const searchQuery = ref('')
  const filterValue = ref('')

  const filteredItems = computed(() => {
    let result = options.items.value
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(item =>
        options.searchFields.some(field =>
          String(item[field] || '').toLowerCase().includes(q)
        )
      )
    }
    if (filterValue.value && options.filterField) {
      result = result.filter(item =>
        String(item[options.filterField!]) === filterValue.value
      )
    }
    return result
  })

  return { searchQuery, filterValue, filteredItems }
}
