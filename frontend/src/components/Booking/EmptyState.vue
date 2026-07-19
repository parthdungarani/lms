<template>
	<div
		class="flex flex-col items-center justify-center gap-2 px-5 py-16 text-center"
	>
		<div class="text-p-base text-ink-gray-6">{{ message }}</div>
		<router-link v-if="actionTo" :to="actionTo">
			<Button variant="outline" class="mt-2">{{ actionLabel }}</Button>
		</router-link>
	</div>
</template>
<script setup>
import { Button } from 'frappe-ui'

defineProps({
	message: { type: String, required: true },
	actionLabel: { type: String, default: '' },
	actionTo: { type: String, default: '' },
})
</script>
