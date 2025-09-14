<script setup lang="ts">
import { gql } from '@apollo/client/core'
import { useQuery } from '@vue/apollo-composable'
import { ref, watch } from 'vue'

const GET_TEACHERS = gql`
  query {
    teachers(first: 10) {
      data {
        id
        name
        email
        courses {
          id
          name
          level
          year
        }
      }
      paginatorInfo {
        hasMorePages
      }
    }
  }
`

const { result, loading, error } = useQuery(GET_TEACHERS)
const teachers = ref([])

watch(result, () => {
  console.log(result.value)
    if (result.value) {
    teachers.value = result.value.teachers.data
  }
})
</script>

<template>
  <div>
    <h1>Profesores</h1>
    <ul>
      <li v-for="teacher in teachers" :key="teacher.id">
        {{ teacher.name }}
      </li>
    </ul>
  </div>
</template>

<style scoped>

</style>