<template>
	<LayoutHeader>
		<template #left-header>
			<Breadcrumbs
				:items="[
					{ label: __('Material Hub'), route: { name: 'MaterialHub' } },
					{ label: bundle.data?.title || __('Details'), route: { name: 'MaterialDetail', params: { name } } },
				]"
			/>
		</template>
	</LayoutHeader>

	<div class="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10">
		<SkeletonLoader v-if="bundle.loading" variant="list" :count="4" />

		<div v-else-if="bundle.data" class="grid gap-8 lg:grid-cols-[1fr_320px]">
			<!-- Main content -->
			<div>
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-surface-gray-2 px-2.5 py-1 text-xs font-medium text-ink-gray-7"
				>
					<span class="lucide-book-open size-3.5" /> {{ __('Study Material Bundle') }}
				</span>
				<h1 class="mt-3 text-2xl font-semibold text-ink-gray-9">{{ bundle.data.title }}</h1>
				<div
					v-if="bundle.data.description"
					class="prose-sm mt-3 max-w-none text-ink-gray-7"
					v-html="sanitize(bundle.data.description)"
				/>

				<!-- What's included -->
				<section class="mt-8">
					<h2 class="text-lg font-semibold text-ink-gray-9">{{ __("What's included") }}</h2>
					<p class="mt-1 text-p-sm text-ink-gray-6">
						{{ bundle.data.file_count }} {{ __('downloadable PDF resources') }}
					</p>
					<ol class="mt-4 space-y-3">
						<li
							v-for="(file, i) in bundle.data.files"
							:key="i"
							class="flex gap-3 rounded-xl border border-outline-gray-2 bg-surface-white p-4"
						>
							<span
								class="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-gray-2 text-p-sm font-semibold text-ink-gray-7"
							>
								{{ i + 1 }}
							</span>
							<div class="min-w-0">
								<div class="flex items-center gap-2 text-base-semibold text-ink-gray-9">
									<span class="lucide-file-text size-4 text-ink-gray-5" /> {{ file.label }}
								</div>
								<p v-if="file.description" class="mt-1 text-p-sm text-ink-gray-6">
									{{ file.description }}
								</p>
							</div>
						</li>
						<li v-if="!bundle.data.files?.length" class="text-p-sm text-ink-gray-5">
							{{ __('Contents will be listed here.') }}
						</li>
					</ol>
				</section>

				<!-- What you'll get -->
				<section class="mt-8">
					<h2 class="text-lg font-semibold text-ink-gray-9">{{ __("What you'll get") }}</h2>
					<ul class="mt-3 grid gap-2 sm:grid-cols-2">
						<li v-for="benefit in benefits" :key="benefit" class="flex items-start gap-2 text-p-sm text-ink-gray-7">
							<span class="lucide-circle-check mt-0.5 size-4 shrink-0 text-ink-green-600" />
							{{ benefit }}
						</li>
					</ul>
				</section>

				<!-- How it works -->
				<section class="mt-8">
					<h2 class="text-lg font-semibold text-ink-gray-9">{{ __('How it works') }}</h2>
					<ol class="mt-3 space-y-2">
						<li v-for="(step, i) in steps" :key="i" class="flex items-start gap-3 text-p-sm text-ink-gray-7">
							<span class="text-base-semibold text-ink-gray-9">{{ i + 1 }}.</span> {{ step }}
						</li>
					</ol>
				</section>
			</div>

			<!-- Purchase panel -->
			<aside class="lg:sticky lg:top-6 lg:self-start">
				<div class="rounded-2xl border border-outline-gray-2 bg-surface-white p-6 shadow-sm">
					<div class="text-3xl font-semibold text-ink-gray-9">
						{{ formatCurrencyWithCode(bundle.data.amount, bundle.data.currency) }}
					</div>
					<p class="mt-1 text-p-sm text-ink-gray-6">{{ __('One-time purchase · lifetime access') }}</p>

					<div class="mt-4 space-y-2 text-p-sm text-ink-gray-7">
						<div class="flex items-center gap-2">
							<span class="lucide-file-text size-4 text-ink-gray-5" />
							{{ bundle.data.file_count }} {{ __('PDF files') }}
						</div>
						<div class="flex items-center gap-2">
							<span class="lucide-download size-4 text-ink-gray-5" /> {{ __('View & download anytime') }}
						</div>
					</div>

					<Button
						v-if="bundle.data.owned"
						class="mt-5 w-full"
						variant="solid"
						@click="router.push({ name: 'MyMaterials' })"
					>
						{{ __('Go to My Purchases') }}
					</Button>
					<Button
						v-else
						class="mt-5 w-full"
						variant="solid"
						@click="router.push({ name: 'MaterialCheckout', params: { name } })"
					>
						<template #prefix><span class="lucide-shopping-cart size-4" /></template>
						{{ __('Buy now') }}
					</Button>

					<div class="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-gray-5">
						<span class="lucide-shield-check size-3.5" /> {{ __('Secure payment via Razorpay') }}
					</div>
				</div>
			</aside>
		</div>
	</div>
</template>

<script setup>
import { createResource, Button, Breadcrumbs, usePageMeta } from 'frappe-ui'
import { useRouter } from 'vue-router'
import LayoutHeader from '@/components/Layouts/LayoutHeader.vue'
import SkeletonLoader from '@/components/SkeletonLoader.vue'
import { formatCurrencyWithCode } from '@/utils/localize'
import { sanitizeRichHTML } from '@/utils/sanitizeRichHTML'

const props = defineProps({ name: { type: String, required: true } })
const router = useRouter()

const bundle = createResource({
	url: 'celpipedu.api.materials.get_bundle',
	params: { name: props.name },
	auto: true,
})

const benefits = [
	__('Instant access right after payment'),
	__('Download the PDFs or view them in your browser'),
	__('Available anytime from My Purchases'),
	__('Built for CELPIP CLB 10+ preparation'),
]
const steps = [
	__('Complete your secure payment.'),
	__('The bundle appears instantly in “My Purchases”.'),
	__('View or download each PDF whenever you need it.'),
]

function sanitize(html) {
	return sanitizeRichHTML(html || '')
}

usePageMeta(() => ({ title: bundle.data?.title || __('Material') }))
</script>
