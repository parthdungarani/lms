<template>
	<Badge :theme="theme" :label="status" />
</template>
<script setup>
import { computed } from 'vue'
import { Badge } from 'frappe-ui'

const props = defineProps({
	status: { type: String, required: true },
})

const THEME_BY_STATUS = {
	Confirmed: 'green',
	Completed: 'green',
	'Pending Payment': 'orange',
	Pending: 'orange',
	'Payment Failed': 'red',
	Failed: 'red',
	Cancelled: 'gray',
	'No Show': 'gray',
}

const theme = computed(() => THEME_BY_STATUS[props.status] || 'gray')
</script>
