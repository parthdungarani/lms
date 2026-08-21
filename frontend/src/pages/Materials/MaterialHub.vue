<template>
	<LayoutHeader>
		<template #left-header>
			<Breadcrumbs :items="[{ label: __('Material Hub'), route: { name: 'MaterialHub' } }]" />
		</template>
	</LayoutHeader>
	<div class="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:py-10">
		<div class="mb-6">
			<h1 class="text-xl-semibold text-ink-gray-9">{{ __('Study Material Hub') }}</h1>
			<p class="mt-1 text-p-base text-ink-gray-6">
				{{ __('Purchase downloadable PDF study packs for your CELPIP prep.') }}
			</p>
		</div>

		<SkeletonLoader v-if="bundles.loading" variant="list" :count="3" />
		<EmptyStateLayout
			v-else-if="!bundles.data?.length"
			name="Materials"
			icon="lucide-book-open"
			:description="__('No materials are available yet. Please check back soon.')"
		/>
		<div v-else class="grid gap-5 sm:grid-cols-2">
			<div
				v-for="b in bundles.data"
				:key="b.name"
				class="flex cursor-pointer flex-col rounded-xl border border-outline-gray-2 bg-surface-white p-5 transition-colors hover:border-outline-gray-3"
				@click="viewDetails(b)"
			>
				<div class="flex items-start justify-between gap-2">
					<div class="text-base-semibold text-ink-gray-9">{{ b.title }}</div>
					<Badge v-if="b.owned" variant="subtle" theme="green" size="sm" :label="__('Owned')" />
				</div>
				<div class="mt-1 line-clamp-2 text-p-sm text-ink-gray-6" v-html="sanitize(b.description)" />
				<div class="mt-3 flex items-center gap-1.5 text-p-sm text-ink-gray-5">
					<span class="lucide-file-text size-4" /> {{ b.file_count }} {{ __('PDFs') }}
				</div>
				<div class="mt-auto flex items-center justify-between pt-4">
					<span class="text-base-semibold text-ink-gray-9">
						{{ formatCurrencyWithCode(b.amount, b.currency) }}
					</span>
					<Button
						v-if="b.owned"
						variant="outline"
						@click.stop="router.push({ name: 'MyMaterials' })"
					>
						{{ __('View / Download') }}
					</Button>
					<Button v-else variant="solid" @click.stop="viewDetails(b)">
						{{ __('View details') }}
					</Button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { createResource, Button, Badge, Breadcrumbs, usePageMeta } from 'frappe-ui'
import { useRouter } from 'vue-router'
import LayoutHeader from '@/components/Layouts/LayoutHeader.vue'
import EmptyStateLayout from '@/components/Layouts/EmptyStateLayout.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import { formatCurrencyWithCode } from '@/utils/localize'
import { sanitizeRichHTML } from '@/utils/sanitizeRichHTML'

const router = useRouter()
const bundles = createResource({ url: 'celpipedu.api.materials.list_bundles', auto: true })

function viewDetails(b) {
	router.push({ name: 'MaterialDetail', params: { name: b.name } })
}
function sanitize(html) {
	return sanitizeRichHTML(html || '')
}

usePageMeta(() => ({ title: __('Material Hub') }))
</script>
