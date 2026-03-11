// Copyright (c) 2025 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

import { useState } from 'react'
import { Button } from '@/components/atoms/button'
import { HiPlus, HiArrowLeft } from 'react-icons/hi'
import DaDialog from '@/components/molecules/DaDialog'
import FormCreateModel from '@/components/molecules/forms/FormCreateModel'
import { TbLoader, TbPackageExport, TbSteeringWheel } from 'react-icons/tb'
import DaImportFile from '@/components/atoms/DaImportFile'
import { zipToModel } from '@/lib/zipUtils'
import { createModelService } from '@/services/model.service'
import { createPrototypeService } from '@/services/prototype.service'
import { ModelCreate, Prototype } from '@/types/model.type'
import useSelfProfileQuery from '@/hooks/useSelfProfile'
import { addLog } from '@/services/log.service'
import { useNavigate } from 'react-router-dom'
import DaSkeletonGrid from '@/components/molecules/DaSkeletonGrid'
import { Skeleton } from '@/components/atoms/skeleton'
import DaModelItem from '@/components/molecules/DaModelItem'
import { Link } from 'react-router-dom'
import { ModelLite } from '@/types/model.type'
import useListAllModels from '@/hooks/useListAllModel'
import useListBrands from '@/hooks/useListBrands'
import { Brand } from '@/types/brand.type'

const PageModelList = () => {
  const navigate = useNavigate()
  const [isImporting, setIsImporting] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)

  const { data: user } = useSelfProfileQuery()
  const { data: brands = [], isLoading: brandsLoading } = useListBrands()

  // Fetch models only when a brand is selected
  const {
    data,
    isLoading: modelsLoading,
    refetch: refetchAllModels,
  } = useListAllModels(selectedBrand?.id ?? null)

  const {
    ownedModels = [],
    contributedModels = [],
    publicReleasedModels = [],
  } = data || {}

  // Combine all models for the selected brand, with Base Model first
  const combined = [
    ...ownedModels,
    ...contributedModels.filter((m) => !ownedModels.find((o) => o.id === m.id)),
    ...publicReleasedModels.filter(
      (m) =>
        !ownedModels.find((o) => o.id === m.id) &&
        !contributedModels.find((c) => c.id === m.id),
    ),
  ]
  const allModels = [...combined].sort((a, b) => {
    // Base Model always appears first
    if (a.is_base_model && !b.is_base_model) return -1
    if (!a.is_base_model && b.is_base_model) return 1
    return 0
  })

  const handleImportModelZip = async (file: File) => {
    const model = await zipToModel(file)
    if (model) {
      setIsImporting(true)
      await createNewModel(model)
    }
  }

  const createNewModel = async (importedModel: any) => {
    if (!importedModel || !importedModel.model) return
    try {
      const newModel: ModelCreate = {
        custom_apis: importedModel.model.custom_apis
          ? JSON.stringify(importedModel.model.custom_apis)
          : 'Empty',
        cvi: importedModel.model.cvi,
        main_api: importedModel.model.main_api || 'Vehicle',
        model_home_image_file:
          importedModel.model.model_home_image_file ||
          '/ref/E-Car_Full_Vehicle.png',
        model_files: importedModel.model.model_files || {},
        name: importedModel.model.name || 'New Imported Model',
        extended_apis: importedModel.model.extended_apis || [],
        api_version: importedModel.model.api_version || 'v4.1',
        visibility: 'private',
        brand_id: selectedBrand?.id || null,
      }

      const createdModel = await createModelService(newModel)

      addLog({
        name: `New model '${createdModel.name}' with visibility: ${createdModel.visibility}`,
        description: `New model '${createdModel.name}' was created by ${
          user?.email || user?.name || user?.id
        }`,
        type: 'new-model',
        create_by: user?.id!,
        ref_id: createdModel.id,
        ref_type: 'model',
      })

      if (importedModel.prototypes.length > 0) {
        const prototypePromises = importedModel.prototypes.map(
          async (proto: Partial<Prototype>) => {
            const newPrototype: Partial<Prototype> = {
              state: proto.state || 'development',
              apis: { VSS: [], VSC: [] },
              code: proto.code || '',
              widget_config: proto.widget_config || '{}',
              description: proto.description,
              tags: proto.tags || [],
              image_file: proto.image_file,
              model_id: createdModel,
              name: proto.name,
              complexity_level: proto.complexity_level || '3',
              customer_journey: proto.customer_journey || '{}',
              portfolio: proto.portfolio || {},
            }
            return createPrototypeService(newPrototype)
          },
        )
        await Promise.all(prototypePromises)
      }

      await refetchAllModels()
      navigate(`/model/${createdModel}`)
    } catch (err) {
      console.error('Error creating model from zip: ', err)
    } finally {
      setIsImporting(false)
    }
  }

  // If no brand selected, show brand selection view
  if (!selectedBrand) {
    return (
      <div className="flex flex-col w-full h-full relative">
        <div className="sticky top-0 flex min-h-[52px] items-center border-b border-muted-foreground/50 bg-background z-50 px-4">
          <h1 className="text-lg font-semibold text-primary">
            Select a Brand
          </h1>
        </div>

        <div className="flex w-full h-[calc(100%-52px)] items-start bg-slate-200 p-2">
          <div className="flex flex-col w-full h-full bg-background rounded-lg overflow-y-auto">
            <div className="flex flex-col w-full container px-4 py-6">
              <p className="text-sm text-muted-foreground mb-6">
                Select a vehicle brand to view and create prototypes for its vehicle
                models.
              </p>

              {brandsLoading ? (
                <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[180px] rounded-lg" />
                  ))}
                </div>
              ) : brands.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <TbSteeringWheel className="text-6xl text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No car brands available. Please run the seed script first.
                  </p>
                  <code className="mt-2 text-sm bg-muted px-3 py-1 rounded">
                    yarn seed:brands
                  </code>
                </div>
              ) : (
                <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {brands.map((brand) => (
                    <div
                      key={brand.id}
                      onClick={() => setSelectedBrand(brand)}
                      className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-xl cursor-pointer hover:border-primary hover:shadow-lg transition-all duration-200 group"
                    >
                      {brand.logo_url ? (
                        <img
                          src={brand.logo_url}
                          alt={brand.name}
                          className="h-20 w-20 object-contain mb-4"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                          <TbSteeringWheel className="text-4xl text-primary" />
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-primary">
                        {brand.name}
                      </h3>
                      {brand.description && (
                        <p className="text-sm text-muted-foreground mt-2 text-center">
                          {brand.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Brand is selected - show vehicle models under that brand
  return (
    <div className="flex flex-col w-full h-full relative">
      <div className="sticky top-0 flex min-h-[52px] items-center gap-4 border-b border-muted-foreground/50 bg-background z-50 px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedBrand(null)}
          className="flex items-center gap-1"
        >
          <HiArrowLeft className="text-lg" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {selectedBrand.logo_url ? (
            <img
              src={selectedBrand.logo_url}
              alt={selectedBrand.name}
              className="h-8 w-8 object-contain"
            />
          ) : (
            <TbSteeringWheel className="text-2xl text-primary" />
          )}
          <h1 className="text-lg font-semibold text-primary">
            {selectedBrand.name} - Vehicle Models
          </h1>
        </div>
      </div>

      <div className="flex w-full h-[calc(100%-52px)] items-start bg-slate-200 p-2">
        <div className="flex flex-col w-full h-full bg-background rounded-lg overflow-y-auto">
          <div className="flex flex-col w-full container px-4 py-6">
            <div className="flex w-full items-center justify-between mb-6">
              <p className="text-sm text-muted-foreground">
                Select a vehicle model to create prototypes and run simulations.
              </p>
              {user && (
                <div className="flex gap-2">
                  {!isImporting ? (
                    <DaImportFile
                      accept=".zip"
                      onFileChange={handleImportModelZip}
                    >
                      <Button variant="outline" size="sm">
                        <TbPackageExport className="mr-1 text-lg" />
                        Import Model
                      </Button>
                    </DaImportFile>
                  ) : (
                    <p className="flex items-center text-base text-muted-foreground">
                      <TbLoader className="animate-spin text-lg mr-2" />
                      Importing model ...
                    </p>
                  )}
                  <DaDialog
                    trigger={
                      <Button
                        variant="default"
                        size="sm"
                        data-id="btn-open-form-create"
                      >
                        <HiPlus className="mr-1 text-lg" />
                        Add Vehicle Model
                      </Button>
                    }
                  >
                    <FormCreateModel defaultBrandId={selectedBrand.id} />
                  </DaDialog>
                </div>
              )}
            </div>

            <DaSkeletonGrid
              maxItems={{ sm: 1, md: 2, lg: 3, xl: 3 }}
              className="mt-2"
              itemWrapperClassName="w-full grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6"
              primarySkeletonClassName="h-[270px]"
              secondarySkeletonClassName="hidden"
              data={allModels}
              isLoading={modelsLoading}
              emptyText={`No vehicle models found for ${selectedBrand.name}. Click "Add Vehicle Model" to create one.`}
              emptyContainerClassName="h-[50%]"
            >
              {allModels.length > 0 && (
                <div className="grid w-full grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
                  {allModels.map((model: ModelLite, index: number) => (
                    <Link key={index} to={`/model/${model.id}`}>
                      <DaModelItem model={model} />
                    </Link>
                  ))}
                </div>
              )}
            </DaSkeletonGrid>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PageModelList
