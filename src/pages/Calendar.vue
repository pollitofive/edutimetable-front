<script setup lang="ts">
import Lucide from "@/components/Base/Lucide";
import events from "@/fakers/events";
import { Tab, Menu } from "@/components/Base/Headless";
import Button from "@/components/Base/Button";
import Calendar from "@/components/Calendar";
import { Draggable as FullCalendarDraggable } from "@/components/Base/Calendar";
import { Draggable } from "@fullcalendar/interaction";
import _ from "lodash";


</script>

<template>
  <div class="grid grid-cols-12 gap-y-10 gap-x-6">
    <div class="col-span-12">
      
      <div class="mt-3.5 flex flex-col lg:flex-row gap-y-10 gap-x-6">
        
        <div class="flex flex-col w-full gap-y-7">
          <div class="flex flex-col p-5 box box--stacked">
            <Calendar />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
